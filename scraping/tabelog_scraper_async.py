"""
非同期（asyncio）で tabelog_scraper の処理を並列化した最小実装。
- 既存の同期関数（HTTP取得・HTML解析・保存）はそのまま利用
- asyncio + 標準スレッドプール（asyncio.to_thread）で「市」「店」単位を並列化
- 元ファイル（tabelog_scraper.py）は変更しない
注意:
- get_html 内の sleep は各スレッド内で実行されるためイベントループはブロックしません
- サイト負荷を避けるため同時数は控えめのデフォルトにしています
- 市のページングは ?PG= のクエリで付与/除去できるURLが多いため build_paged_url を用意
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import os
import sys
from typing import Dict, List
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# 同一ディレクトリの同期版モジュールを import 可能にする
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

import tabelog_scraper as sync  # 同期版（既存）

# 並列度のデフォルト（必要に応じて調整）
MAX_CITY_CONCURRENCY = 4  # 同時に処理する市の数
MAX_RESTAURANT_CONCURRENCY = 8  # 1市内で同時に処理する店舗の数


async def to_thread(func, /, *args, **kwargs):
    """asyncio.to_thread の薄いラッパ（型補助のため）。"""
    return await asyncio.to_thread(func, *args, **kwargs)


def build_paged_url(base_url: str, page: int) -> str:
    """一覧URLにページ番号(PG)を付与/更新する（1ページ目はPGなし）。"""
    try:
        u = urlsplit(base_url)
        q = dict(parse_qsl(u.query))
        if page and page > 1:
            q["PG"] = str(page)
        else:
            q.pop("PG", None)
        return urlunsplit(
            (u.scheme, u.netloc, u.path, urlencode(q, doseq=True), u.fragment)
        )
    except Exception:
        # URLパースに失敗した場合はそのまま返す（安全側）
        return base_url


async def scrape_restaurant_async(
    restaurant_url: str, pref_key: str, city_name: str, restaurant_index: int
) -> List[str]:
    """1店舗の口コミ一覧ページを取得して、詳細ページから本文を抽出（同期ロジックをスレッドで実行）。"""
    # 元コードと同様のURL組み立て（末尾に dtlrvwlst）
    review_url = f"{restaurant_url}dtlrvwlst"
    review_html = await to_thread(sync.get_html, review_url)
    if not review_html:
        return []
    # 詳細ページの取得と本文抽出は既存の同期関数に委譲（内部で逐次HTTP）
    return await to_thread(
        sync.extract_reviews, review_html, pref_key, city_name, restaurant_index
    )


async def scrape_city_async(
    pref_key: str,
    city_name: str,
    city_url: str,
    page: int,
    restaurant_sem: asyncio.Semaphore,
) -> None:
    """市区町村ページ→店舗URL抽出→各店舗の口コミ取得→市単位で保存。"""
    page_url = build_paged_url(city_url, page)

    # 市ページ取得（軽いリトライ）
    city_html = await to_thread(sync.get_html, page_url)
    if not city_html:
        city_html = await to_thread(sync.get_html, page_url)
        if not city_html:
            print(f"{city_name}のページ取得に失敗。スキップ。 ({page_url})")
            return

    # 店舗URL抽出
    restaurant_urls = sync.extract_restaurant_urls(city_html)
    if not restaurant_urls:
        print(f"{city_name}で飲食店URL抽出に失敗。フォールバックを試します。")
        # 並び替えを変えて再取得（元コードの意図に沿って city_url にパラメータを付けて再取得）
        fallback_url = f"{city_url}?SrtT=rvcn"
        fb_html = await to_thread(sync.get_html, fallback_url)
        if fb_html:
            restaurant_urls = sync.extract_restaurant_urls(fb_html)

    if not restaurant_urls:
        print(f"{city_name}で飲食店URL抽出に失敗。スキップ。")
        return

    print(f"{city_name}から{len(restaurant_urls)}件の飲食店URLを抽出しました。")

    # 市内の各店舗を並列処理（過剰な同時実行を避けるためセマフォ）
    async def run_one_restaurant(url: str, restaurant_index: int) -> List[str]:
        async with restaurant_sem:
            return await scrape_restaurant_async(
                url, pref_key, city_name, restaurant_index
            )

    tasks = [
        asyncio.create_task(run_one_restaurant(u, i))
        for i, u in enumerate(restaurant_urls)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    city_reviews: List[str] = []
    for r in results:
        if isinstance(r, Exception):
            continue
        city_reviews.extend(r)

    if city_reviews:
        await to_thread(sync.save_reviews_to_txt, city_reviews, pref_key, city_name)
        print(f"{city_name}の口コミ {len(city_reviews)}件 を保存しました。")
    else:
        print(f"{city_name}の口コミが見つかりませんでした。")


async def run_async(url_dict: Dict[str, Dict[str, str]], page: int) -> None:
    """全都道府県・市区町村を非同期で処理。"""
    # スレッドプールを拡張（デフォルトでも動くが、少し増やすと待ち時間を隠蔽しやすい）
    loop = asyncio.get_running_loop()
    loop.set_default_executor(concurrent.futures.ThreadPoolExecutor(max_workers=32))

    city_sem = asyncio.Semaphore(MAX_CITY_CONCURRENCY)
    restaurant_sem = asyncio.Semaphore(MAX_RESTAURANT_CONCURRENCY)

    async def run_one_city(pref_key: str, city_name: str, city_url: str):
        async with city_sem:
            await scrape_city_async(pref_key, city_name, city_url, page, restaurant_sem)

    tasks = []
    for pref_key, pref_cities in sorted(url_dict.items()):
        for city_name, city_url in pref_cities.items():
            tasks.append(
                asyncio.create_task(run_one_city(pref_key, city_name, city_url))
            )

    await asyncio.gather(*tasks)


def main() -> None:
    try:
        page = int(input("処理するページ番号を入力してください（例: 1）: ") or 1)
    except Exception:
        page = 1

    url_dict = sync.read_json_file(f"{sync.base_url}/tabelog_urls.json")

    print(f"\n=== 非同期実行を開始: ページ {page} ===\n")
    asyncio.run(run_async(url_dict, page))
    print(f"\n=== 非同期実行が完了しました: ページ {page} ===\n")


if __name__ == "__main__":
    main()
