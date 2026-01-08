import os
import glob
import unicodedata
import geopandas as gpd
import re
import numpy as np
import ctypes

import MeCab
import ipadic
from sklearn.feature_extraction.text import CountVectorizer
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from PIL import Image
import json
import subprocess
# MeCabの設定
mecab = MeCab.Tagger(ipadic.MECAB_ARGS)
# JSON保存先
json_path = "wordcloud_layout_detail.json"


# -----------------------------
# MeCab DLL 読み込み（Windows向け）
# -----------------------------
LIBMECAB_PATH = r"C:\Program Files\MeCab\bin\libmecab.dll"
ctypes.cdll.LoadLibrary(LIBMECAB_PATH)

import MeCab
import ipadic

# -----------------------------
# ユーザー辞書作成（food_dict.csv）
# -----------------------------
USER_DIC_CSV = "./create_wordcloud/filtered_food.csv"
USER_DIC_BIN = "./food_user.dic"

if os.path.exists(USER_DIC_CSV):
    try:
        subprocess.run(
            [
                r"C:\Program Files\MeCab\bin\mecab-dict-index.exe",
                "-d",
                ipadic.DICDIR,
                "-u",
                USER_DIC_BIN,
                "-f",
                "utf-8",
                "-t",
                "utf-8",
                USER_DIC_CSV,
            ],
            check=True,
        )
        print("✅ ユーザー辞書を作成しました")
    except subprocess.CalledProcessError as e:
        print("❌ ユーザー辞書作成に失敗:", e)
else:
    print(f"❌ {USER_DIC_CSV} が見つかりません")

# -----------------------------
# ユーザー辞書単語セット
# -----------------------------
user_words = set()
if os.path.exists(USER_DIC_CSV):
    with open(USER_DIC_CSV, encoding="utf-8") as f:
        for line in f:
            word = line.strip().split(",")[0]
            if word:
                user_words.add(word)

# -----------------------------
# MeCab タグ設定（ユーザー辞書付き）
# -----------------------------
mecab_args = f'-d "{ipadic.DICDIR}" -u "{USER_DIC_BIN}"'
mecab = MeCab.Tagger(mecab_args)

# -----------------------------
# 形態素解析＋ユーザー辞書フィルター関数
# -----------------------------
def mecab_tokenizer_user_only(text):
    text = unicodedata.normalize("NFKC", text)
    text = text.upper()
    text = re.sub(r"[【】 ()（）『』　「」]", "", text)
    text = re.sub(r"[[［］]]", " ", text)
    text = re.sub(r"[@＠]\w+", "", text)
    text = re.sub(r"\d+\.\d+", "", text)

    parsed = mecab.parse(text)
    if parsed is None:
        return ""
    parsed_lines = parsed.split("\n")[:-2]
    surfaces = [l.split("\t")[0] for l in parsed_lines]
    # ユーザー辞書にある単語のみ残す
    token_list = [t for t in surfaces if t in user_words]
    return " ".join(token_list)

prefectures = [
    "北海道",
    "青森",
    "岩手",
    "宮城",
    "秋田",
    "山形",
    "福島",
    "茨城",
    "栃木",
    "群馬",
    "埼玉",
    "千葉",
    "東京",
    "神奈川",
    "新潟",
    "富山",
    "石川",
    "福井",
    "山梨",
    "長野",
    "岐阜",
    "静岡",
    "愛知",
    "三重",
    "滋賀",
    "京都",
    "大阪",
    "兵庫",
    "奈良",
    "和歌山",
    "鳥取",
    "島根",
    "岡山",
    "広島",
    "山口",
    "徳島",
    "香川",
    "愛媛",
    "高知",
    "福岡",
    "佐賀",
    "長崎",
    "熊本",
    "大分",
    "宮崎",
    "鹿児島",
    "沖縄",
]
with open("./create_wordcloud/non_food_words.json", "r", encoding="utf-8") as f:
    stoper = json.load(f)
# stopwords 定義
stopwords = set(
    stoper
    + prefectures
)

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
    "山梨県": "yamanashi",
}
gdf = gpd.read_file("./public/pref_hex_merged_sikutyoson.geojson")
output_base_dir = "./wordcloud_map_layer"
all_word_counts = {}
wordcloud_datas = {}
# 全都道府県ループ

print(gdf)
for idx, row in gdf.iterrows():

    png_dir = f"./prefecture_layer/{idx}.png"
    texts = []
    for N03_003 in row["N03_003"].split("_"):
        path_parts = N03_003
        txt_dir = f'./create_wordcloud/tabelog_results/{search_word[row["N03_001"]]}/'
        pattern = f"*{path_parts}*.txt"  # path_partsを含むファイル名のパターン

        matched_txt_files = glob.glob(os.path.join(txt_dir, pattern))
        if len(matched_txt_files) == 0:
            print(f"❌ 対応するテキストファイルがありません: {pattern}")
            continue

        for filepath in glob.glob(os.path.join(txt_dir, "*.txt")):
            with open(filepath, encoding="utf-8") as f:
                t = mecab_tokenizer_user_only(f.read())
                if t.strip():        # ← 空は入れない
                    texts.append(t)

        if not texts:
            print(f"⚠ {search_word}: texts が空。スキップ")
            continue
            # TF-IDF 計算（+ stopwords 除去）
        vectorizer = CountVectorizer(max_features=1000000)
        if texts==['']:
            continue
        X = vectorizer.fit_transform(texts)
        words = vectorizer.get_feature_names_out()
        counts = np.asarray(X.sum(axis=0)).ravel()
        word_counts = {
            w: int(c)
            for w, c in zip(words, counts)
            if w not in stopwords and not w.isdigit()
        }

        if not word_counts:
            continue
        search_txt = str(idx)

        key = row["N03_001"] + "/" + row["N03_003"]

        # その市区町村のカウント辞書が無ければ初期化
        if key not in all_word_counts:
            all_word_counts[key] = {}

        # word_counts 内の単語をマージする
        for word, count in word_counts.items():
            all_word_counts[key][word] = all_word_counts[key].get(word, 0) + count


global_max = max(c for wc in all_word_counts.values() for c in wc.values())
count = 0
debag={}
for search_txt, word_counts in all_word_counts.items():
    count += 1
    normalized_word_counts = {w: c  for w, c in word_counts.items()}
    mask_path = f'./prefecture_layer/{search_txt.split("/")[1]}.png'
    if not os.path.exists(mask_path):
        print(f"❌ マスク画像がありません: {mask_path}")
        continue
    mask_image = Image.open(mask_path).convert("L")
    mask_array = np.array(mask_image)
    mask_indices = np.where(mask_array < 128)
    if mask_indices[0].size == 0 or mask_indices[1].size == 0:
        raise ValueError(f"マスク画像に有効な領域がありません: ")
    min_y_offset = int(np.min(mask_indices[0]))
    max_y_offset = int(np.max(mask_indices[0]))
    min_x_offset = int(np.min(mask_indices[1]))
    max_x_offset = int(np.max(mask_indices[1]))

    font_path = "C:/Windows/Fonts/YuGothR.ttc"
    wordcloud = WordCloud(
        background_color="white",
        width=mask_array.shape[1],
        height=mask_array.shape[0],
        font_path=font_path,
        colormap="coolwarm",
        max_words=min(50, len(normalized_word_counts)),
        max_font_size=300,
        include_numbers=False,
        mask=mask_array,
        relative_scaling=0.5,
        min_font_size=0.1
    )
    print(search_txt)
    try:
        wordcloud.generate_from_frequencies(normalized_word_counts)
        debag[search_txt.split("/")[1]]=normalized_word_counts
    except ValueError:
        continue

    # JSON レイアウト
    word_layout_data = {"name": search_txt.split("/")[1], "data": []}
    for word, font_size, position, orientation, color in wordcloud.layout_:
        abs_x = float(position[1])
        abs_y = float(position[0])
        rel_x = abs_x
        rel_y = abs_y
        norm_x = rel_x / (max_x_offset - min_x_offset)
        norm_y = rel_y / (max_y_offset - min_y_offset)
        word_layout_data["data"].append(
            {
                "word": word[0],
                "count": word_counts.get(word[0], 0),
                "font_size": font_size,
                "x": round(rel_x, 2),
                "y": round(rel_y, 2),
                "norm_x": round(norm_x, 6),
                "norm_y": round(norm_y, 6),
                "orientation": orientation,
                "color": color,
                "print_area_x": [0, mask_array.shape[1]],
                "print_area_y": [0, mask_array.shape[0]],
            }
        )
    key = search_txt.split("/")[0]
    if key not in wordcloud_datas:
        wordcloud_datas[key] = []
    wordcloud_datas[key].append(word_layout_data)
    if(len(word_layout_data["data"])==0):
        print(debag[search_txt.split("/")[1]])
    print(count, "/", len(all_word_counts), "✅ レイアウトデータ生成完了:", search_txt)
    if(count==1):
        print(word_layout_data)
for pref_name_jp, datas in wordcloud_datas.items():
    # ① 保存先フォルダのパス
    output_dir = f"./public/data/wordcloud_map_layer/{pref_name_jp}/"

    # ② フォルダがなければ作成
    os.makedirs(output_dir, exist_ok=True)

    # ③ JSON 保存
    with open(os.path.join(output_dir, json_path), "w", encoding="utf-8") as f:
        json.dump(datas, f, ensure_ascii=False, indent=2)

    print(f"✅ {pref_name_jp} のレイアウトデータを {json_path} に保存しました。")


print("🎉 全都道府県のワードクラウドレイアウト生成完了")
