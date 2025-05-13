import os
import json
import time
import requests
from bs4 import BeautifulSoup
import re
import random

# 食べログの全国一覧ページのURL
nationwide_url = "https://tabelog.com/rstLst/"

# 保存先ディレクトリの作成
os.makedirs("tabelog_json", exist_ok=True)
os.makedirs("tabelog_results", exist_ok=True)

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
        return None


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

    return restaurant_urls


def extract_reviews(html):
    """口コミを抽出する"""
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")

    # rvw-item__contents クラスが付与されたdiv要素を検索
    review_contents = soup.find_all("div", class_="rvw-item__contents")

    reviews = []

    for content in review_contents:
        # rvw-showall-trigger__target クラスが付与されたspan要素があるか確認
        has_showall = content.find("span", class_="rvw-showall-trigger__target")

        if has_showall:
            # c-link-circle js-link-bookmark-detailクラスが付与されたaタグを検索
            detail_link = content.find(
                "a", class_="c-link-circle js-link-bookmark-detail"
            )

            if detail_link:
                detail_url = detail_link.get("data-detail-url")

                if detail_url:
                    # &amp; を空文字列に置換
                    detail_url = detail_url.replace("&amp;", "")
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
        else:
            # 直接口コミテキストを抽出
            review_div = content.find(
                "div", class_="rvw-item__rvw-comment rvw-item__rvw-comment--custom"
            )

            if review_div:
                p_tags = review_div.find_all("p")
                review_text = "\n".join([p.get_text(strip=True) for p in p_tags])
                reviews.append(review_text)

    return reviews


def save_to_json(data, filename):
    """データをJSONファイルに保存する"""
    filepath = os.path.join("tabelog_json", filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"保存完了: {filepath}")


def save_reviews_to_txt(reviews, prefecture_key, town_name):
    """口コミをテキストファイルに保存する"""
    # 都道府県ディレクトリを作成
    pref_dir = os.path.join("tabelog_results", prefecture_key)
    os.makedirs(pref_dir, exist_ok=True)

    # ファイルパス
    filepath = os.path.join(pref_dir, f"{town_name}.txt")

    # テキストファイルに保存
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(reviews))

    print(f"口コミ保存完了: {filepath} ({len(reviews)}件)")


def main():
    # ユーザーから都道府県名を入力
    target_prefecture = input(
        "都道府県名をアルファベットで入力してください（例: hokkaido, tokyo）。空の場合はすべての都道府県を処理します: "
    ).strip()

    # 1. nationwide_urlに格納されているurlのソースを取得する
    print("全国一覧ページを取得中...")
    nationwide_html = get_html(nationwide_url)

    if not nationwide_html:
        print("全国一覧ページの取得に失敗しました。")
        return

    # 2 & 3. 都道府県情報を抽出
    print("都道府県情報を抽出中...")
    prefecture_dict = extract_prefecture_info(nationwide_html)

    if not prefecture_dict:
        print("都道府県情報の抽出に失敗しました。")
        return

    print(f"{len(prefecture_dict)}件の都道府県情報を抽出しました。")

    # 指定された都道府県が存在するか確認
    if target_prefecture and target_prefecture not in prefecture_dict:
        print(
            f"エラー: 指定された都道府県 '{target_prefecture}' は見つかりませんでした。"
        )
        print(f"利用可能な都道府県: {', '.join(prefecture_dict.keys())}")
        return

    # 処理する都道府県を決定
    if target_prefecture:
        # 指定された都道府県のみ処理
        target_prefectures = {target_prefecture: prefecture_dict[target_prefecture]}
        print(f"指定された都道府県 '{target_prefecture}' のみを処理します。")
    else:
        # すべての都道府県を処理
        target_prefectures = prefecture_dict
        print("すべての都道府県を処理します。")

    cnt = 0

    # 4. 各都道府県のURLに対して処理を繰り返す
    for pref_key, pref_info in sorted(target_prefectures.items()):
        if cnt >= 30:
            return
        pref_url = pref_info["url"]
        pref_name = pref_info["name"]

        print(f"\n{pref_name}({pref_key})の処理を開始します...")

        # 5 & 6. 都道府県ページのソースを取得
        print(f"{pref_name}のページを取得中...")
        pref_html = get_html(pref_url)

        if not pref_html:
            print(f"{pref_name}のページ取得に失敗しました。次の都道府県に進みます。")
            continue

        # 7 & 8. 市区町村情報を抽出
        print(f"{pref_name}の市区町村情報を抽出中...")
        city_dict = extract_city_info(pref_html)

        if not city_dict:
            print(
                f"{pref_name}の市区町村情報の抽出に失敗しました。次の都道府県に進みます。"
            )
            continue

        print(f"{pref_name}から{len(city_dict)}件の市区町村情報を抽出しました。")

        # JSONファイルに保存
        json_filename = f"{pref_key}.json"
        save_to_json(city_dict, json_filename)

        # 市区町村ごとに処理
        city_count = 0

        for city_name, city_url in city_dict.items():

            city_count += 1
            print(f"{city_name}の飲食店情報を取得中...")

            # 9. 口コミのスクレイピング結果を保持する変数（市区町村ごとに初期化）
            city_reviews = []

            # 市区町村ページを取得
            city_html = get_html(city_url)

            if not city_html:
                print(
                    f"{city_name}のページ取得に失敗しました。次の市区町村に進みます。"
                )
                continue

            # 10. 飲食店のURLを抽出
            restaurant_urls = extract_restaurant_urls(city_html)

            if not restaurant_urls:
                print(
                    f"{city_name}から飲食店URLの抽出に失敗しました。次の市区町村に進みます。"
                )
                continue

            print(f"{city_name}から{len(restaurant_urls)}件の飲食店URLを抽出しました。")

            # 飲食店ごとに処理
            restaurant_count = 0

            for restaurant_url in restaurant_urls:

                restaurant_count += 1

                # 11. 口コミページのURLを作成
                review_url = f"{restaurant_url}dtlrvwlst/?lc=2"
                print(f"口コミページを取得中: {review_url}")

                # 口コミページを取得
                review_html = get_html(review_url)

                if not review_html:
                    print(f"口コミページの取得に失敗しました。次の飲食店に進みます。")
                    continue

                # 12-19. 口コミを抽出
                reviews = extract_reviews(review_html)

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

    print("\n全ての処理が完了しました。")


if __name__ == "__main__":
    main()
