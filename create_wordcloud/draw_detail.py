import os
import glob
import unicodedata
import re
import numpy as np
import ctypes
ctypes.cdll.LoadLibrary(r"C:\Program Files\MeCab\bin\libmecab.dll")
import MeCab
import ipadic
from sklearn.feature_extraction.text import TfidfVectorizer
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from PIL import Image
import json

# MeCabの設定
mecab = MeCab.Tagger(ipadic.MECAB_ARGS)

# 形態素解析＋前処理関数
def mecab_tokenizer(text):
    replaced_text = unicodedata.normalize("NFKC", text)
    replaced_text = replaced_text.upper()
    replaced_text = re.sub(r'[【】 ()（）『』　「」]', '', replaced_text)
    replaced_text = re.sub(r'[[［］]]', ' ', replaced_text)
    replaced_text = re.sub(r'[@＠]\w+', '', replaced_text)
    replaced_text = re.sub(r'\d+\.\d+', '', replaced_text)

    parsed_lines = mecab.parse(replaced_text).split("\n")[:-2]
    surfaces = [l.split("\t")[0] for l in parsed_lines]
    pos = [l.split("\t")[1].split(",")[0] for l in parsed_lines]
    target_pos = ["名詞"]
    token_list = [t for t, p in zip(surfaces, pos) if p in target_pos]

    return ' '.join(token_list)

# stopwords 定義
stopwords = set([
    "讃岐", "居酒屋", "店", "円", "味", "料理", "さん", "ラーメン", "肉", "ランチ", "最高", "そば", "麺",
    "雰囲気", "丼", "定食", "メニュー", "満足", "注文", "人", "蕎麦", "感じ", "店員", "普通", "セット",
    "2", "時", "酒", "方", "利用", "うどん", "値段", "ご飯", "的", "時間", "カレー", "スープ", "ボリューム",
    "量", "中", "屋", "こと", "訪問", "1", "コース", "放題", "店内", "牛", "一", "刺身", "ー", "接客",
    "ここ", "どれ", "日", "好き", "焼き", "味噌", "野菜", "種類", "パ", "天ぷら", "何", "感", "予約",
    "カツ", "コス", "よう", "食事", "残念", "揚げ", "対応", "目", "餃子", "寿司", "3", "気", "豚",
    "個室", "そう", "席", "塩", "前", "豊富", "もの", "魚", "唐", "チャーシュー", "おすすめ", "パン",
    "駅", "今日", "醤油", "中華", "提供", "笑", "これ", "丁寧", "サービス", "今回", "コスパ", "サラダ"
])

search_word = {
    "愛知県": "aichi",
    "秋田県": "akita",
    "青森県": "aomori",
    "千葉県": "chiba",
    "愛媛県": "ehime",
    "福井県": "fukui",
    "福岡県": "fukuoka",
    "福島県": "fukushima",
    "岐阜県": "gifu",
    "群馬県": "gunma",
    "広島県": "hiroshima",
    "北海道": "hokkaido",
    "兵庫県": "hyogo",
    "茨城県": "ibaraki",
    "石川県": "ishikawa",
    "岩手県": "iwate",
    "香川県": "kagawa",
    "鹿児島県": "kagoshima",
    "神奈川県": "kanagawa",
    "高知県": "kochi",
    "熊本県": "kumamoto",
    "京都府": "kyoto",
    "三重県": "mie",
    "宮城県": "miyagi",
    "宮崎県": "miyazaki",
    "長野県": "nagano",
    "長崎県": "nagasaki",
    "奈良県": "nara",
    "新潟県": "niigata",
    "大分県": "oita",
    "岡山県": "okayama",
    "沖縄県": "okinawa",
    "大阪府": "osaka",
    "佐賀県": "saga",
    "埼玉県": "saitama",
    "滋賀県": "shiga",
    "島根県": "shimane",
    "静岡県": "shizuoka",
    "栃木県": "tochigi",
    "徳島県": "tokushima",
    "東京都": "tokyo",
    "鳥取県": "tottori",
    "富山県": "toyama",
    "和歌山県": "wakayama",
    "山形県": "yamagata",
    "山口県": "yamaguchi",
    "山梨県": "yamanashi"
}

output_base_dir = './wordcloud_map_layer'

# 全都道府県ループ
for pref_name_jp, pref_name_en in search_word.items():

    png_dir = f'./prefecture_layer/{pref_name_jp}'
    for filepath in glob.glob(os.path.join(png_dir, '*.png')):
        path_parts = os.path.splitext(os.path.basename(filepath))[0]
        text_path = f'./create_wordcloud/tabelog_results/{pref_name_en}/{path_parts}.txt'
        if not os.path.exists(text_path):
            print(f"❌ ファイルが存在しません: {text_path}")
            continue
        with open(text_path, encoding='utf-8') as f:
            text = f.read()
            tokenized = mecab_tokenizer(text)

        # TF-IDF 計算（+ stopwords 除去）
        vectorizer = TfidfVectorizer(max_features=200)
        X = vectorizer.fit_transform([tokenized])
        words = vectorizer.get_feature_names_out()
        scores = np.asarray(X.mean(axis=0)).ravel()
        word_scores_raw = dict(zip(words, scores))

        word_scores = {
            word: score for word, score in word_scores_raw.items()
            if word not in stopwords
        }

        # マスク画像読み込み
        mask_path = f'./prefecture_layer/{pref_name_jp}/{path_parts}.png'
        mask_image = Image.open(mask_path).convert("L")
        mask_array = np.array(mask_image)

        mask_indices = np.where(mask_array < 128)
        if mask_indices[0].size == 0 or mask_indices[1].size == 0:
            raise ValueError(f"マスク画像に有効な領域がありません: {pref_name_jp}")

        min_y_offset = int(np.min(mask_indices[0]))
        max_y_offset = int(np.max(mask_indices[0]))
        min_x_offset = int(np.min(mask_indices[1]))
        max_x_offset = int(np.max(mask_indices[1]))

        # WordCloud 描画
        font_path = "C:/Windows/Fonts/YuGothR.ttc"
        wordcloud = WordCloud(
            background_color="white",
            width=mask_array.shape[1],
            height=mask_array.shape[0],
            font_path=font_path,
            colormap="coolwarm",
            max_words=200,
            mask=mask_array
        ).generate_from_frequencies(word_scores)

        # JSONレイアウトデータ作成
        word_layout_data = {"name": path_parts, "data": []}

        for (word, font_size, position, orientation, color) in wordcloud.layout_:
            abs_x = float(position[1])
            abs_y = float(position[0])
            rel_x = abs_x - min_x_offset
            rel_y = abs_y - min_y_offset
            norm_x = rel_x / (max_x_offset - min_x_offset)
            norm_y = rel_y / (max_y_offset - min_y_offset)

            word_info = {
                "word": word[0],
                "tfidf_score": word_scores.get(word[0], 0),
                "font_size": font_size,
                "print_area_x": [min_x_offset, max_x_offset],
                "print_area_y": [min_y_offset, max_y_offset],
                "x": round(rel_x, 2),
                "y": round(rel_y, 2),
                "norm_x": round(norm_x, 6),
                "norm_y": round(norm_y, 6),
                "orientation": orientation,
                "color": color
            }
            word_layout_data["data"].append(word_info)

        # JSONファイルに追記保存
        pref_output_dir = os.path.join(output_base_dir, pref_name_jp)
        os.makedirs(pref_output_dir, exist_ok=True)

        json_path = os.path.join(pref_output_dir, 'wordcloud_layout_detail.json')

        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
        else:
            existing_data = []

        existing_data.append(word_layout_data)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)

        print(f"✅ {path_parts} のレイアウトデータを {json_path} に保存しました。")

    print(f"🎉 {pref_name_jp}のワードクラウドレイアウト生成完了")

print("🎉 全都道府県のワードクラウドレイアウト生成完了")
