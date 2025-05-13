import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import random
import re
import os
from datetime import datetime

class TabelogScraper:
    def __init__(self, comments_only=False):
        self.base_url = "https://tabelog.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        }
        self.results = []
        self.processed_reviews = set()  # 重複チェック用のセット
        self.comments_only = comments_only  # 口コミのみを取得するフラグ
        
    def search_restaurants(self, area_code, keyword="", page=1, sort_type="popular"):
        """エリアコードとキーワードに基づいてレストランを検索
        
        area_code: エリアコード（例: A1300）またはエリア名（例: tokyo）
        keyword: レストラン検索キーワード
        sort_type: ソート方法
            - "popular": 人気順（デフォルト）
            - "rating": 評価の高い順
            - "new": 新着順
        """
        # ソートパラメータを設定
        sort_param = ""
        if sort_type == "popular":
            sort_param = "&SrtT=trend"  # 人気順
        elif sort_type == "rating":
            sort_param = "&SrtT=rt"     # 評価の高い順
        elif sort_type == "new":
            sort_param = "&SrtT=rht"    # 新着順
        
        # キーワードパラメータを設定（sw または sk を試す）
        keyword_param = ""
        if keyword:
            keyword_param = f"&sw={keyword}"  # 新しいパラメータ
        
        # エリアコードがA1300のような形式かチェック
        if area_code.startswith('A') and area_code[1:].isdigit():
            search_url = f"{self.base_url}/rstLst/{page}/?vs=1&sa={area_code}{keyword_param}{sort_param}"
        else:
            # エリア名から検索する場合（例：東京、大阪など）
            search_url = f"{self.base_url}/{area_code}/rstLst/{page}/?vs=1{keyword_param}{sort_param}"
            
        print(f"検索URL: {search_url}")
        response = requests.get(search_url, headers=self.headers)
        
        if response.status_code != 200:
            print(f"検索ページの取得に失敗しました。ステータスコード: {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.text, 'lxml')
        restaurant_links = []
        restaurant_names = []
        
        # レストランのリンクと名前を取得
        restaurant_elements = soup.select("a.list-rst__rst-name-target")
        for element in restaurant_elements:
            restaurant_links.append(element['href'])
            restaurant_names.append(element.text.strip())
            
        print(f"{len(restaurant_links)}件のレストランが見つかりました")
        for i, name in enumerate(restaurant_names):
            print(f"  {i+1}. {name}")
            
        # 次のページがあるかチェック
        next_page = soup.select_one("a.c-pagination__arrow--next")
        has_next_page = next_page is not None
            
        return restaurant_links, has_next_page
    
    def get_review_pages(self, restaurant_url):
        """レストランの口コミページ数を取得"""
        # URLが完全なURLかチェック
        if not restaurant_url.startswith('http'):
            restaurant_url = self.base_url + restaurant_url
            
        review_url = f"{restaurant_url}dtlrvwlst/"
        print(f"口コミページURL: {review_url}")
        response = requests.get(review_url, headers=self.headers)
        
        if response.status_code != 200:
            print(f"口コミページの取得に失敗しました。ステータスコード: {response.status_code}")
            return 0, "不明"
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # レストラン名を取得
        restaurant_name = soup.select_one("h2.display-name").text.strip() if soup.select_one("h2.display-name") else "不明"
        
        # ページネーションを確認
        pagination = soup.select("a.c-pagination__num")
        if not pagination:
            return 1, restaurant_name
        
        # 最後のページ番号を取得
        last_page = int(pagination[-1].text.strip())
        return last_page, restaurant_name
    
    def scrape_reviews(self, restaurant_url):
        """レストランの口コミを取得"""
        # URLが完全なURLかチェック
        if not restaurant_url.startswith('http'):
            restaurant_url = self.base_url + restaurant_url
        
        # 最新の口コミURLパターンを試す（人気順でソート）
        review_patterns = [
            f"{restaurant_url}dtlrvwlst/?rvw_sort=rating",  # 古いパターン（評価の高い順）
            f"{restaurant_url}reviews/?sort=rating",        # 新しいパターン（評価の高い順）
            f"{restaurant_url}dtlrvwlst/",                  # 古いパターン（デフォルト）
            f"{restaurant_url}reviews/",                    # 新しいパターン（デフォルト）
        ]
        
        print(f"デバッグ: 口コミURLパターン = {review_patterns}")
        
        review_base_url = None
        restaurant_name = "不明"
        max_pages = 0
        
        # 有効なURLパターンを見つける
        for pattern in review_patterns:
            print(f"口コミURLパターンを試行: {pattern}")
            try:
                response = requests.get(pattern, headers=self.headers)
                if response.status_code == 200:
                    review_base_url = pattern
                    soup = BeautifulSoup(response.text, 'lxml')
                    
                    # レストラン名を取得
                    restaurant_name_selectors = [
                        "h2.display-name",           # 古いセレクタ
                        "h2.rstname",                # 別のセレクタ
                        "h1.rstname",                # 別のセレクタ
                        "h1.fn",                     # 別のセレクタ
                        "div.rstinfo-table__name"    # 別のセレクタ
                    ]
                    
                    for selector in restaurant_name_selectors:
                        name_element = soup.select_one(selector)
                        if name_element:
                            restaurant_name = name_element.text.strip()
                            break
                    
                    # ページネーションを確認
                    pagination_selectors = [
                        "a.c-pagination__num",    # 古いセレクタ
                        "a.page-link"             # 新しいセレクタ
                    ]
                    
                    for selector in pagination_selectors:
                        pagination = soup.select(selector)
                        if pagination:
                            try:
                                max_pages = int(pagination[-1].text.strip())
                                break
                            except (ValueError, IndexError):
                                continue
                    
                    if max_pages == 0:
                        max_pages = 1
                        
                    print(f"有効なURLパターンを見つけました: {pattern}")
                    print(f"レストラン「{restaurant_name}」の口コミページ数: {max_pages}")
                    break
            except Exception as e:
                print(f"URLパターン {pattern} の確認中にエラーが発生しました: {e}")
                continue
        
        if review_base_url is None:
            print("有効な口コミURLパターンが見つかりませんでした")
            return
        
        # 各ページをスクレイピング
        for page in range(1, max_pages + 1):
            if review_base_url.endswith('/'):
                review_url = f"{review_base_url}{page}/"
            else:
                review_url = f"{review_base_url}/page-{page}/"
                
            print(f"口コミページ {page}/{max_pages} をスクレイピング中... URL: {review_url}")
            
            try:
                response = requests.get(review_url, headers=self.headers)
                if response.status_code != 200:
                    print(f"ページ {page} の取得に失敗しました。ステータスコード: {response.status_code}")
                    
                    # 別のURLパターンを試す
                    alt_patterns = [
                        f"{restaurant_url}reviews/page-{page}/",
                        f"{restaurant_url}dtlrvwlst/{page}/",
                        f"{restaurant_url}reviews/?page={page}",
                        f"{restaurant_url}reviews/?PG={page}"
                    ]
                    
                    success = False
                    for alt_url in alt_patterns:
                        print(f"代替URLを試行: {alt_url}")
                        try:
                            alt_response = requests.get(alt_url, headers=self.headers)
                            if alt_response.status_code == 200:
                                print(f"代替URL {alt_url} での取得に成功しました")
                                response = alt_response
                                success = True
                                break
                        except Exception:
                            continue
                    
                    if not success:
                        continue
            except Exception as e:
                print(f"リクエスト中にエラーが発生しました: {e}")
                continue
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # 口コミ要素を取得（複数のセレクタを試す）
            review_selectors = [
                "div.rvw-item",           # 古いセレクタ
                "div.review-item",        # 新しいセレクタ
                "div.js-rvw-item-clickable-area",  # 別のセレクタ
                "div[data-rvw-id]"        # 属性ベースのセレクタ
            ]
            
            review_elements = []
            for selector in review_selectors:
                elements = soup.select(selector)
                if elements:
                    review_elements = elements
                    print(f"セレクタ '{selector}' で {len(elements)} 件の口コミを見つけました")
                    break
                    
            if not review_elements:
                print("このページで口コミ要素が見つかりませんでした")
            
            for review in review_elements:
                # 口コミの個別URLを取得
                review_url_element = review.select_one("a.rvw-item__title-target") or review.select_one("a.review-title")
                if not review_url_element:
                    print("口コミの個別URLが見つかりませんでした")
                    continue
                
                review_detail_url = review_url_element['href']
                if not review_detail_url.startswith('http'):
                    review_detail_url = self.base_url + review_detail_url
                
                print(f"口コミの個別ページにアクセス: {review_detail_url}")
                
                # 個別ページにアクセスして全文を取得
                try:
                    detail_response = requests.get(review_detail_url, headers=self.headers)
                    if detail_response.status_code != 200:
                        print(f"口コミ個別ページの取得に失敗しました。ステータスコード: {detail_response.status_code}")
                        continue
                        
                    detail_soup = BeautifulSoup(detail_response.text, 'lxml')
                    
                    # 口コミ本文を取得（複数のセレクタを試す）
                    text_selectors = [
                        "div#rvw-comment__text",       # 個別ページの口コミ本文
                        "p.rvw-item__rvw-comment",     # 古いセレクタ
                        "p.review-text",               # 新しいセレクタ
                        "div.rvw-item__rvw-comment",   # 別のセレクタ
                        "div.review-comment"           # 別のセレクタ
                    ]
                    
                    review_text = ""
                    for selector in text_selectors:
                        text_element = detail_soup.select_one(selector)
                        if text_element:
                            review_text = text_element.text.strip()
                            print("口コミの全文を取得しました")
                            break
                            
                    if not review_text:
                        print("口コミ本文が見つかりませんでした")
                        continue
                        
                    # サーバーに負荷をかけないよう待機
                    time.sleep(random.uniform(2, 5))
                    
                except Exception as e:
                    print(f"口コミ個別ページの取得中にエラーが発生しました: {e}")
                    continue
                
                if not review_text:
                    continue
                
                # 投稿者名を取得
                reviewer_element = review.select_one("a.rvw-item__reviewer-name")
                reviewer_name = reviewer_element.text.strip() if reviewer_element else "不明"
                
                # 投稿日を取得
                date_element = review.select_one("div.rvw-item__date")
                post_date = date_element.text.strip() if date_element else "不明"
                
                # 評価を取得
                rating_element = review.select_one("span.c-rating__val")
                rating = rating_element.text.strip() if rating_element else "不明"
                
                # 口コミのみを保存するか、すべての情報を保存するか
                if self.comments_only:
                    self.results.append({
                        "口コミ": review_text
                    })
                    print(f"口コミのみを保存しました（ページ {page}）")
                else:
                    # すべての情報を保存
                    self.results.append({
                        "レストラン名": restaurant_name,
                        "投稿者": reviewer_name,
                        "投稿日": post_date,
                        "評価": rating,
                        "口コミ": review_text,
                        "URL": review_url,
                        "ページ": page,
                        "ソート方法": self.current_sort_type if hasattr(self, 'current_sort_type') else "不明"
                    })
                    print(f"口コミを保存しました（ページ {page}）")
            
            # サーバーに負荷をかけないよう待機
            time.sleep(random.uniform(2, 5))
    
    def scrape_area(self, area_code, restaurant_keyword="", sort_type="popular"):
        """指定されたエリアのレストランをスクレイピング
        
        area_code: エリアコード（例: A1300）またはエリア名（例: tokyo）
        restaurant_keyword: レストラン検索キーワード
        sort_type: ソート方法
            - "popular": 人気順（デフォルト）
            - "rating": 評価の高い順
            - "new": 新着順
        """
        # 現在のソート方法を保存
        self.current_sort_type = sort_type
        
        restaurants_scraped = 0
        page = 1
        has_next_page = True
        
        while has_next_page:
            print(f"レストラン検索ページ {page} をスクレイピング中...")
            restaurant_links, has_next_page = self.search_restaurants(area_code, restaurant_keyword, page, sort_type)
            
            for i, link in enumerate(restaurant_links):
                restaurants_scraped += 1
                print(f"\nレストラン {restaurants_scraped} をスクレイピング中...")
                try:
                    self.scrape_reviews(link)
                except Exception as e:
                    print(f"エラーが発生しました: {e}")
                
                # サーバーに負荷をかけないよう待機
                time.sleep(random.uniform(3, 7))
            
            # 次のページへ
            if has_next_page:
                page += 1
                print(f"次のページ（{page}）に進みます...")
                time.sleep(random.uniform(3, 7))
            else:
                print("最後のページに到達しました。")
    
    def save_results(self, filename=None):
        """スクレイピング結果をCSVファイルに保存"""
        if not self.results:
            print("保存する結果がありません。")
            return
        
        # 結果保存用のディレクトリを作成
        results_dir = "results"
        if not os.path.exists(results_dir):
            os.makedirs(results_dir)
            print(f"結果保存用ディレクトリを作成しました: {results_dir}")
            
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.join(results_dir, f"tabelog_reviews_{timestamp}.csv")
        elif not os.path.isabs(filename):
            filename = os.path.join(results_dir, filename)
        
        # 絶対パスを取得して表示
        abs_path = os.path.abspath(filename)
        print(f"結果を保存します: {abs_path}")
            
        df = pd.DataFrame(self.results)
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        
        # 保存確認
        if os.path.exists(filename):
            print(f"{len(self.results)}件の口コミを {filename} に保存しました。")
            print(f"ファイルサイズ: {os.path.getsize(filename)} バイト")
        else:
            print(f"エラー: ファイル {filename} の保存に失敗しました。")

def main():
    # エリアコードの例:
    # 東京: A1300 (東京都) または tokyo
    # 大阪: A2700 (大阪府) または osaka
    # 京都: A2600 (京都府) または kyoto
    # 北海道: A0100 (北海道) または hokkaido
    # 福岡: A4000 (福岡県) または fukuoka
    
    print("エリアコードまたはエリア名を入力してください")
    print("例1: A1300（東京都のエリアコード）")
    print("例2: tokyo（東京のエリア名）")
    area_code = input("エリアコード/エリア名: ").strip()
    
    print("\nお店を検索するキーワードを入力してください")
    print("例: ラーメン, 寿司, イタリアン")
    restaurant_keyword = input("お店のキーワード: ").strip()
    
    print("\nソート方法を選択してください")
    print("1: 人気順（デフォルト）")
    print("2: 評価の高い順")
    print("3: 新着順")
    sort_choice = input("選択（1-3）: ").strip() or "1"
    
    # ソート方法の設定
    sort_type = "popular"  # デフォルト
    sort_name = "人気順"
    if sort_choice == "2":
        sort_type = "rating"
        sort_name = "評価の高い順"
    elif sort_choice == "3":
        sort_type = "new"
        sort_name = "新着順"
    
    # 口コミのみを取得するかどうか
    print("\n口コミのみを取得しますか？")
    print("1: はい（口コミテキストのみを取得）")
    print("2: いいえ（レストラン名、投稿者名なども取得）")
    comments_only_choice = input("選択（1-2）: ").strip() or "2"
    comments_only = comments_only_choice == "1"
    
    scraper = TabelogScraper(comments_only=comments_only)
    print(f"エリアコード '{area_code}' で「{restaurant_keyword}」を含むお店を検索します...")
    print(f"ソート方法: {sort_name} ({sort_type})")
    print(f"口コミのみ取得: {'はい' if comments_only else 'いいえ'}")
    print("すべてのレストランの口コミを取得します...")
    
    # 検索を実行（すべてのレストランを取得）
    scraper.scrape_area(area_code, restaurant_keyword, sort_type=sort_type)
    
    # 結果の保存
    if scraper.results:
        scraper.save_results()
        print(f"\n{len(scraper.results)}件の口コミを保存しました。")
    else:
        print("\n検索条件に一致するお店が見つからないか、口コミがありませんでした。")
    
    print("\nスクレイピングが完了しました。")

if __name__ == "__main__":
    main()
