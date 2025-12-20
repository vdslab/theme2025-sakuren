import os
import glob
import unicodedata
import re
import numpy as np
import ctypes
import ipadic
from collections import Counter
from sklearn.feature_extraction.text import CountVectorizer
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from PIL import Image
import json
import subprocess

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

    tokens = []
    noun_buffer = []  # 名詞連結用バッファ

    for line in parsed.split("\n"):
        if line == "EOS" or line.strip() == "":
            continue

        surface, feature = line.split("\t")
        features = feature.split(",")

        pos = features[0]

        # --- 名詞の場合 ---
        if pos == "名詞" and not surface.isdigit():
            noun_buffer.append(surface)
            continue

        # --- 名詞以外が来たら、名詞バッファを確定 ---
        if noun_buffer:
            tokens.append("".join(noun_buffer))
            noun_buffer = []

    # 文末が名詞で終わった場合
    if noun_buffer:
        tokens.append("".join(noun_buffer))
    return " ".join(tokens)


with open("./create_wordcloud/non_food_words.json", "r", encoding="utf-8") as f:
    stoper = json.load(f)

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

# 画像保存ディレクトリ
# 都道府県リスト
search_words = [
    "愛知県",
    "秋田県",
    "青森県",
    "千葉県",
    "愛媛県",
    "福井県",
    "福岡県",
    "福島県",
    "岐阜県",
    "群馬県",
    "広島県",
    "北海道",
    "兵庫県",
    "茨城県",
    "石川県",
    "岩手県",
    "香川県",
    "鹿児島県",
    "神奈川県",
    "高知県",
    "熊本県",
    "京都府",
    "三重県",
    "宮城県",
    "宮崎県",
    "長野県",
    "長崎県",
    "奈良県",
    "新潟県",
    "大分県",
    "岡山県",
    "沖縄県",
    "大阪府",
    "佐賀県",
    "埼玉県",
    "滋賀県",
    "島根県",
    "静岡県",
    "栃木県",
    "徳島県",
    "東京都",
    "鳥取県",
    "富山県",
    "和歌山県",
    "山形県",
    "山口県",
    "山梨県",
]
# stopwords 定義
stopwords = set(
    stoper
    + prefectures
    + search_words
)

search_words_roma = [
    "aichi",
    "akita",
    "aomori",
    "chiba",
    "ehime",
    "fukui",
    "fukuoka",
    "fukushima",
    "gifu",
    "gunma",
    "hiroshima",
    "hokkaido",
    "hyogo",
    "ibaraki",
    "ishikawa",
    "iwate",
    "kagawa",
    "kagoshima",
    "kanagawa",
    "kochi",
    "kumamoto",
    "kyoto",
    "mie",
    "miyagi",
    "miyazaki",
    "nagano",
    "nagasaki",
    "nara",
    "niigata",
    "oita",
    "okayama",
    "okinawa",
    "osaka",
    "saga",
    "saitama",
    "shiga",
    "shimane",
    "shizuoka",
    "tochigi",
    "tokushima",
    "tokyo",
    "tottori",
    "toyama",
    "wakayama",
    "yamagata",
    "yamaguchi",
    "yamanashi",
]

# 全都道府県ループ
# 出力ディレクトリ
image_output_dir = "./wordcloud_images"
os.makedirs(image_output_dir, exist_ok=True)

# JSON保存先
json_path = "wordcloud_layout.json"
if os.path.exists(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        existing_data = json.load(f)
else:
    existing_data = []

# --- 追加: まず全県の word_counts を一時保存 ---
all_word_counts = {}
wordList = set()
for i, search_word in enumerate(search_words):
    search_word_roma = search_words_roma[i]
    txt_dir = f"./create_wordcloud/tabelog_results/{search_word_roma}"

    documents = []
    for filepath in glob.glob(os.path.join(txt_dir, "*.txt")):
        with open(filepath, encoding="utf-8") as f:
            documents.append(mecab_tokenizer_user_only(f.read()))

    if not documents:
        continue

    vectorizer = CountVectorizer(max_features=10000)
    X = vectorizer.fit_transform(documents)
    words = vectorizer.get_feature_names_out()
    counts = np.asarray(X.sum(axis=0)).ravel()
    for w in words:
        wordList.add(w)
    word_counts = {
        w: int(c)
        for w, c in zip(words, counts)
        if w not in stopwords and not w.isdigit()
    }
    if not word_counts:
        continue

    all_word_counts[search_word] = word_counts
with open(
    "./tilegram_app/public/wordcloud_layout_wordList.json", "w", encoding="utf-8"
) as f:
    f.write("[\n")

    word_list = list(wordList)
    chunk_size = 1000

    for i in range(0, len(word_list), chunk_size):
        chunk = word_list[i : i + chunk_size]
        json.dump(chunk, f, ensure_ascii=False)
        if i + chunk_size < len(word_list):
            f.write(",\n")  # ← 1000語ごとに改行

    f.write("\n]")

with open(
    "./tilegram_app/public/wordcloud_layout_norm.json", "w", encoding="utf-8"
) as f:
    json.dump(all_word_counts, f, ensure_ascii=False, indent=2)
# --- 全体での最大出現頻度を求める ---
global_max = max(c for wc in all_word_counts.values() for c in wc.values())
print(f"全体の最大頻度: {global_max}")

# --- 正規化してWordCloud生成 ---
for search_word, word_counts in all_word_counts.items():
    normalized_word_counts = {w: c for w, c in word_counts.items()}

    mask_path = f"./prefecture_layer/{search_word}/{search_word}.png"
    mask_image = Image.open(mask_path).convert("L")
    mask_array = np.array(mask_image)

    min_y, max_y = int(np.min(np.where(mask_array < 128)[0])), int(
        np.max(np.where(mask_array < 128)[0])
    )
    min_x, max_x = int(np.min(np.where(mask_array < 128)[1])), int(
        np.max(np.where(mask_array < 128)[1])
    )

    font_path = "C:/Windows/Fonts/YuGothR.ttc"
    wordcloud = WordCloud(
        background_color="white",
        width=mask_array.shape[1],
        height=mask_array.shape[0],
        font_path=font_path,
        colormap="coolwarm",
        max_words=min(50, len(normalized_word_counts)),
        max_font_size=200,
        include_numbers=False,
        mask=mask_array,
        relative_scaling=0.5,
        min_font_size=0.1,
    )

    try:
        wordcloud.generate_from_frequencies(normalized_word_counts)
    except ValueError:
        continue

    output_img_path = os.path.join(image_output_dir, f"{search_word}.png")
    wordcloud.to_file(output_img_path)
    print(f"{search_word} のワードクラウド画像保存: {output_img_path}")

    # JSON レイアウト
    word_layout_data = {"name": search_word, "data": []}
    for word, font_size, position, orientation, color in wordcloud.layout_:
        abs_x = float(position[1])
        abs_y = float(position[0])
        rel_x = abs_x
        rel_y = abs_y
        norm_x = rel_x
        norm_y = rel_y
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
                "print_area_x": [min_x, max_x],
                "print_area_y": [min_y, max_y],
            }
        )

    existing_data.append(word_layout_data)

# JSON 保存
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(existing_data, f, ensure_ascii=False, indent=2)

print("🎉 全都道府県ワードクラウド生成完了")
