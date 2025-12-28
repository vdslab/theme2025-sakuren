from __future__ import annotations

import json
import random
import re
import time
from pathlib import Path
from typing import Any, Union

import requests
from bs4 import BeautifulSoup

# 食べログの全国一覧ページのURL
nationwide_url = "https://tabelog.com/rstLst/"

# ユーザーエージェントのリスト（ブロック対策）
user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
]


def save_json(
    data: Any,
    path: Union[str, Path],
    *,
    ensure_ascii: bool = False,
    indent: int = 2,
    overwrite: bool = True,
) -> Path:
    """
    渡したデータを指定のパスにJSONとして保存する。
    Parameters:
    - data: JSONとして保存可能なPythonオブジェクト（dict, list 等）
    - path: 保存先のファイルパス（文字列またはPath）
    - ensure_ascii: Falseにすると日本語などをそのまま書き込む
    - indent: 整形用インデント（0 または None で一行出力）
    - overwrite: False の場合、既存ファイルがあれば例外を投げる
    Returns:
    - 保存先の Path オブジェクト
    Raises:
    - FileExistsError: overwrite=False かつファイルが既に存在する場合
    - OSError / TypeError / ValueError: ファイル書き込みやデータのシリアライズに失敗した場合
    """
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)

    if p.exists() and not overwrite:
        raise FileExistsError(f"File already exists and overwrite is False: {p}")

    # json.dump はファイルハンドルに書き込む
    with p.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=ensure_ascii, indent=indent)
        f.write("\n")

    return p


def get_random_user_agent():
    """ランダムなユーザーエージェントを返す"""
    return random.choice(user_agents)


def get_html(url):
    """指定されたURLからHTMLを取得する"""
    headers = {
        "User-Agent": get_random_user_agent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
        "Referer": "https://tabelog.com/",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # エラーがあれば例外を発生させる

        # サーバーに負荷をかけないよう、リクエスト間に少し待機
        time.sleep(random.uniform(3, 7))

        return response.text

    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return get_html(url)  # 再試行


def extract_prefecture_info(html):
    """都道府県情報を抽出する"""
    if not html:
        return {}

    soup = BeautifulSoup(html, "html.parser")

    # list-balloon__table list-balloon__table--pref クラスを持つ要素をすべて検索
    pref_tables = soup.find_all(class_="list-balloon__table list-balloon__table--pref")

    if not pref_tables:
        print("都道府県テーブルが見つかりませんでした。")
        return {}

    prefecture_dict = {}

    # 各テーブルからaタグを検索
    for pref_table in pref_tables:
        for a_tag in pref_table.find_all("a"):
            href = a_tag.get("href")
            pref_name = a_tag.get_text(strip=True)

            # https://tabelog.com/*/ の*の部分を抽出
            match = re.search(r"https://tabelog\.com/([^/]+)/", href)
            if match:
                key = match.group(1)
                prefecture_dict[key] = {"url": href, "name": pref_name}

    return prefecture_dict


def extract_city_info(html):
    """市区町村情報を抽出する"""
    if not html:
        return {}

    soup = BeautifulSoup(html, "html.parser")

    # 特定の親要素を検索
    parent_div = soup.find(
        "div",
        id="tabs-panel-balloon-pref-city",
        class_="list-balloon__panel js-leftnavi-panel",
    )

    if not parent_div:
        print("市区町村情報の親要素が見つかりませんでした。")
        return {}

    # 親要素の配下にある list-balloon__list-itemクラスが付与されたli要素を検索
    city_items = parent_div.find_all("li", class_="list-balloon__list-item")

    city_dict = {}

    for item in city_items:
        a_tag = item.find("a")
        if a_tag:
            href = a_tag.get("href")
            span_tag = a_tag.find("span")
            if span_tag:
                city_name = span_tag.get_text(strip=True)
                city_dict[city_name] = href

    return city_dict


def main():
    url_dict = {}

    # 全国のベージを取得
    print("全国一覧ページを取得中...")
    nationwide_html = get_html(nationwide_url)

    # 2 & 3. 都道府県情報を抽出
    print("都道府県情報を抽出中...")
    prefecture_dict = extract_prefecture_info(nationwide_html)

    for k, v in prefecture_dict.items():
        print(f"{v['name']}の市区町村情報を取得中...")
        url = v["url"]

        prefecture_html = get_html(url)
        city_dict = extract_city_info(prefecture_html)

        url_dict[k] = city_dict

    # 4. JSONとして保存
    print("URL情報をJSONとして保存中...")
    save_json(url_dict, "scraping/tabelog_urls.json", ensure_ascii=False)
    print("完了しました。")


if __name__ == "__main__":
    main()
