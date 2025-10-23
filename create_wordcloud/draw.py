import os
import glob
import unicodedata
import re
import numpy as np
import ctypes
import subprocess
import json
from collections import Counter
from sklearn.feature_extraction.text import CountVectorizer
from wordcloud import WordCloud
from PIL import Image

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

# -----------------------------
# 都道府県リスト
# -----------------------------
search_words = [
    "愛知県","秋田県","青森県","千葉県","愛媛県","福井県","福岡県","福島県","岐阜県",
    "群馬県","広島県","北海道","兵庫県","茨城県","石川県","岩手県","香川県","鹿児島県",
    "神奈川県","高知県","熊本県","京都府","三重県","宮城県","宮崎県","長野県","長崎県",
    "奈良県","新潟県","大分県","岡山県","沖縄県","大阪府","佐賀県","埼玉県","滋賀県",
    "島根県","静岡県","栃木県","徳島県","東京都","鳥取県","富山県","和歌山県","山形県",
    "山口県","山梨県"
]
search_words_roma = [
    "aichi","akita","aomori","chiba","ehime","fukui","fukuoka","fukushima","gifu","gunma",
    "hiroshima","hokkaido","hyogo","ibaraki","ishikawa","iwate","kagawa","kagoshima","kanagawa",
    "kochi","kumamoto","kyoto","mie","miyagi","miyazaki","nagano","nagasaki","nara","niigata",
    "oita","okayama","okinawa","osaka","saga","saitama","shiga","shimane","shizuoka","tochigi",
    "tokushima","tokyo","tottori","toyama","wakayama","yamagata","yamaguchi","yamanashi"
]

image_output_dir = "./wordcloud_images"
os.makedirs(image_output_dir, exist_ok=True)

json_path = "wordcloud_layout.json"
existing_data = []
if os.path.exists(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        existing_data = json.load(f)

# -----------------------------
# ワードクラウド生成ループ
# -----------------------------
for i, search_word in enumerate(search_words):
    search_word_roma = search_words_roma[i]
    txt_dir = f"./create_wordcloud/tabelog_results/{search_word_roma}"

    documents = []
    for filepath in glob.glob(os.path.join(txt_dir, "*.txt")):
        with open(filepath, encoding="utf-8") as f:
            documents.append(mecab_tokenizer_user_only(f.read()))

    print(f"{search_word}: 読み込んだファイル数 {len(documents)}")
    if not documents:
        print(f"{search_word} の文章が0件。スキップ")
        continue

    # 出現回数カウント
    vectorizer = CountVectorizer(max_features=100)
    X = vectorizer.fit_transform(documents)
    words = vectorizer.get_feature_names_out()
    counts = np.asarray(X.sum(axis=0)).ravel()
    word_counts = {w:int(c) for w,c in zip(words,counts) if w in user_words}
    if not word_counts:
        print(f"{search_word} の単語が0件。スキップ")
        continue

    # マスク画像
    mask_path = f"./prefecture_layer/{search_word}/{search_word}.png"
    if not os.path.exists(mask_path):
        print(f"{mask_path} がありません。スキップ")
        continue
    mask_array = np.array(Image.open(mask_path).convert("L"))
    mask_indices = np.where(mask_array < 128)
    if mask_indices[0].size == 0 or mask_indices[1].size == 0:
        print(f"{search_word} の描画可能領域がありません。スキップ")
        continue

    min_y, max_y = int(np.min(mask_indices[0])), int(np.max(mask_indices[0]))
    min_x, max_x = int(np.min(mask_indices[1])), int(np.max(mask_indices[1]))

    font_path = "C:/Windows/Fonts/YuGothR.ttc"
    wordcloud = WordCloud(
        background_color="white",
        width=mask_array.shape[1],
        height=mask_array.shape[0],
        font_path=font_path,
        colormap="coolwarm",
        max_words=min(50, len(word_counts)),
        mask=mask_array,
        relative_scaling=1,
    )
    wordcloud.generate_from_frequencies(word_counts)

    # 画像保存
    output_img_path = os.path.join(image_output_dir, f"{search_word}.png")
    wordcloud.to_file(output_img_path)
    print(f"{search_word} ワードクラウド画像保存: {output_img_path}")

    # JSON レイアウト保存
    word_layout_data = {"name": search_word, "data": []}
    for word, font_size, position, orientation, color in wordcloud.layout_:
        abs_x = float(position[1])
        abs_y = float(position[0])
        rel_x = abs_x - min_x
        rel_y = abs_y - min_y
        norm_x = rel_x / (max_x - min_x)
        norm_y = rel_y / (max_y - min_y)
        word_layout_data["data"].append({
            "word": word[0],
            "count": word_counts.get(word[0],0),
            "font_size": font_size,
            "x": round(rel_x,2),
            "y": round(rel_y,2),
            "norm_x": round(norm_x,6),
            "norm_y": round(norm_y,6),
            "orientation": orientation,
            "color": color,
            "print_area_x": [min_x,max_x],
            "print_area_y": [min_y,max_y],
        })
    existing_data.append(word_layout_data)

# JSON 保存
with open(json_path,"w",encoding="utf-8") as f:
    json.dump(existing_data,f,ensure_ascii=False,indent=2)

print("🎉 全都道府県ワードクラウド生成完了")
