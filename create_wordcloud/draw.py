import os
import glob
import json
from collections import Counter
from wordcloud import WordCloud
from PIL import Image
import numpy as np

# -----------------------------
# ユーザー辞書読み込み
# -----------------------------
USER_DIC_CSV = "./create_wordcloud/food_dict.csv"
user_words = set()
with open(USER_DIC_CSV, encoding="utf-8") as f:
    for line in f:
        word = line.strip().split(",")[0]
        if word:
            user_words.add(word)

# -----------------------------
# 都道府県リスト
# -----------------------------
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

    all_text = ""
    for filepath in glob.glob(os.path.join(txt_dir, "*.txt")):
        with open(filepath, encoding="utf-8") as f:
            all_text += f.read().upper()  # 全て大文字化して統一

    if not all_text:
        print(f"{search_word} の文章が0件。スキップ")
        continue

    # -----------------------------
    # 辞書単語の出現回数カウント
    # -----------------------------
    word_counts = {}
    for word in user_words:
        count = all_text.count(word.upper())
        if count > 0:
            word_counts[word] = count

    if not word_counts:
        print(f"{search_word} に辞書単語は0件。スキップ")
        continue

    # -----------------------------
    # マスク画像読み込み
    # -----------------------------
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

    # -----------------------------
    # ワードクラウド生成
    # -----------------------------
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
