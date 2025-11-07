import json
import os
import random
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

base_url = "scraping"

# ユーザーエージェントのリスト（ブロック対策）
user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
]


def get_random_user_agent():
    """ランダムなユーザーエージェントを返す"""
    return random.choice(user_agents)


def get_html(url, retry=False):
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
        time.sleep(random.uniform(1, 4))

        return response.text

    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        if retry:
            print("再試行に失敗しました。")
            return None
        return get_html(url, retry=True)


def extract_restaurant_urls(html):
    """飲食店のURLを抽出する"""
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")

    # list-rst__rst-name-target cpy-rst-name クラスが付与されたaタグを検索
    restaurant_links = soup.find_all(
        "a", class_="list-rst__rst-name-target cpy-rst-name"
    )

    restaurant_urls = []
    for link in restaurant_links:
        href = link.get("href")
        if href:
            restaurant_urls.append(href)

    if not restaurant_urls:
        print("飲食店URLが見つかりませんでした。再試行中...")
        restaurant_urls = []

        soup = BeautifulSoup(html, "html.parser")

        # list-rst__rst-name-target cpy-rst-name クラスが付与されたaタグを検索
        restaurant_links = soup.find_all(
            "a", class_="list-rst__rst-name-target cpy-rst-name"
        )

        for link in restaurant_links:
            href = link.get("href")
            if href:
                restaurant_urls.append(href)

    return restaurant_urls


def extract_reviews(html, pref_name, city_name, restaurant_index):
    """口コミを抽出する"""
    if not html:
        return []

    reviews = []

    soup = BeautifulSoup(html, "html.parser")

    # c-link-circle js-link-bookmark-detailクラスが付与されたaタグを検索
    detail_links = soup.find_all("a", class_="c-link-circle js-link-bookmark-detail")

    count = 0

    for link in detail_links:
        count += 1
        detail_url = link.get("data-detail-url")

        if detail_url:
            full_url = f"https://tabelog.com{detail_url}"

            # 詳細ページを取得
            detail_html = get_html(full_url)

            if detail_html:
                detail_soup = BeautifulSoup(detail_html, "html.parser")

                # 口コミテキストを抽出
                review_div = detail_soup.find(
                    "div",
                    class_="rvw-item__rvw-comment rvw-item__rvw-comment--custom",
                )

                if review_div:
                    p_tags = review_div.find_all("p")
                    review_text = "\n".join([p.get_text(strip=True) for p in p_tags])
                    reviews.append(review_text)

        print(f"{pref_name}/{city_name}/{restaurant_index} 口コミ取得完了: {count}件")

    if not reviews:
        print("口コミが見つかりませんでした。再試行中...")
        reviews = []

        soup = BeautifulSoup(html, "html.parser")

        # c-link-circle js-link-bookmark-detailクラスが付与されたaタグを検索
        detail_links = soup.find_all(
            "a", class_="c-link-circle js-link-bookmark-detail"
        )
        count = 0

        for link in detail_links:
            count += 1
            detail_url = link.get("data-detail-url")

            if detail_url:
                full_url = f"https://tabelog.com{detail_url}"

                # 詳細ページを取得
                detail_html = get_html(full_url)

                if detail_html:
                    detail_soup = BeautifulSoup(detail_html, "html.parser")

                    # 口コミテキストを抽出
                    review_div = detail_soup.find(
                        "div",
                        class_="rvw-item__rvw-comment rvw-item__rvw-comment--custom",
                    )

                    if review_div:
                        p_tags = review_div.find_all("p")
                        review_text = "\n".join(
                            [p.get_text(strip=True) for p in p_tags]
                        )
                        reviews.append(review_text)

            print(f"{pref_name}/{city_name} 口コミ取得完了: {count}件")

    return reviews


def append_line(
    file_path: str | os.PathLike, content: str, encoding: str = "utf-8"
) -> None:
    p = Path(file_path)
    ends_with_newline = (
        True  # 新規/空ファイルでは先頭に改行を入れないため True から開始
    )

    if p.exists():
        with p.open("rb") as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            if size > 0:
                f.seek(-1, os.SEEK_END)
                ends_with_newline = f.read(1) == b"\n"

    with p.open("a", encoding=encoding, newline="") as f:
        if not ends_with_newline:
            f.write("\n")
        f.write(content)


def save_reviews_to_txt(reviews, prefecture_key, city_name):
    """口コミをテキストファイルに保存する"""
    # 都道府県ディレクトリを作成
    pref_dir = os.path.join(f"{base_url}/tabelog_results", prefecture_key)
    os.makedirs(pref_dir, exist_ok=True)

    # ファイルパス
    filepath = os.path.join(pref_dir, f"{city_name}.txt")

    append_line(filepath, "\n".join(reviews))

    print(f"口コミ保存完了: {filepath} ({len(reviews)}件)")


def read_json_file(filepath):
    """JSONファイルを読み込む"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def main():
    page = int(input("処理するページ番号を入力してください（例: 1）: ")) or 1

    url_dict = read_json_file(f"{base_url}/tabelog_urls.json")

    for pref_key, pref_cities in sorted(url_dict.items()):
        for city_name, city_url in pref_cities.items():

            # 9. 口コミのスクレイピング結果を保持する変数（市区町村ごとに初期化）
            city_reviews = []

            # 市区町村ページを取得
            city_html = get_html(city_url)

            if not city_html:
                print(
                    f"{city_name}のページ取得に失敗しました。次の市区町村に進みます。"
                )
                city_html = get_html(city_url)
                if not city_html:
                    print(
                        f"{city_name}のページ取得に失敗しました。次の市区町村に進みます。"
                    )
                    continue

            # 10. 飲食店のURLを抽出
            restaurant_urls = extract_restaurant_urls(f"{city_html}{page}/")

            if not restaurant_urls:
                print(
                    f"{city_name}から飲食店URLの抽出に失敗しました。次の市区町村に進みます。"
                )
                city_html = get_html(city_url)
                restaurant_urls = extract_restaurant_urls(f"{city_html}?SrtT=rvcn")
                if not restaurant_urls:
                    print(
                        f"{city_name}から飲食店URLの抽出に失敗しました。次の市区町村に進みます。"
                    )
                    continue

            print(f"{city_name}から{len(restaurant_urls)}件の飲食店URLを抽出しました。")

            # 飲食店ごとに処理
            restaurant_count = 0

            for idx, restaurant_url in enumerate(restaurant_urls):

                restaurant_count += 1

                # 11. 口コミページのURLを作成
                review_url = f"{restaurant_url}dtlrvwlst"
                print(f"{pref_key}/{city_name} 口コミページを取得中: {review_url}")

                # 口コミページを取得
                review_html = get_html(review_url)

                if not review_html:
                    print(f"口コミページの取得に失敗しました。次の飲食店に進みます。")
                    continue

                # 12-19. 口コミを抽出
                reviews = extract_reviews(review_html, pref_key, city_name, idx)

                if reviews:
                    print(
                        f"{restaurant_count}: {len(reviews)}件の口コミを抽出しました。"
                    )
                    city_reviews.extend(reviews)
                else:
                    print(
                        f"{restaurant_count}: 口コミの抽出に失敗しました。次の飲食店に進みます。"
                    )

            # 20 & 21. 市区町村ごとに口コミをテキストファイルに保存
            if city_reviews:
                save_reviews_to_txt(city_reviews, pref_key, city_name)
                print(f"{city_name}の口コミ {len(city_reviews)}件 を保存しました。")
            else:
                print(f"{city_name}の口コミが見つかりませんでした。")

        print(f"\nページ {page} の処理が完了しました。")


if __name__ == "__main__":
    main()
