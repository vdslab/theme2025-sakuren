import glob
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

import ipadic
import MeCab
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from wordcloud import WordCloud

# -----------------------------
"""都道府県別ワードクラウド画像生成（矩形・マスク無し）

create_wordcloud/draw.py のロジックに寄せつつ、ここでは以下を行わない:
- マスク画像の使用
- レイアウトJSONの出力

mac 実行を想定（Windows用DLLロード等は不要）。
"""

# -----------------------------
# ユーザー辞書作成（filtered_food.csv）
# -----------------------------
USER_DIC_CSV = "./create_wordcloud/filtered_food.csv"
USER_DIC_BIN = "./food_user.dic"


def _find_mecab_dict_index():
    # try PATH first, then common Homebrew locations
    candidates = [
        shutil.which("mecab-dict-index"),
        shutil.which("mecab-dict-index.exe"),
        "/opt/homebrew/bin/mecab-dict-index",
        "/usr/local/bin/mecab-dict-index",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def _find_mecabrc():
    candidates = [
        os.environ.get("MECABRC"),
        "/opt/homebrew/etc/mecabrc",
        "/usr/local/etc/mecabrc",
        "/etc/mecabrc",
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return None


if os.path.exists(USER_DIC_CSV):
    # mecab-dict-index を自動検出して実行する (Windows/mac/linux 共通)
    mecab_dict_index = _find_mecab_dict_index()
    if mecab_dict_index is None:
        print(
            "⚠️ mecab-dict-index が見つかりません。辞書を作成できませんでした。Homebrewで MeCab を入れるか、mecab-dict-index のパスを指定してください。"
        )
    else:
        try:
            subprocess.run(
                [
                    mecab_dict_index,
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
# MeCab タグ設定（ユーザー辞書付き）
# -----------------------------
# MeCab 初期化: mecabrc とユーザー辞書の有無を考慮して段階的に試す
mecabrc_path = _find_mecabrc()
mecab_args_parts = []
if mecabrc_path:
    mecab_args_parts += [f'-r "{mecabrc_path}"']
if os.path.exists(ipadic.DICDIR):
    mecab_args_parts += [f'-d "{ipadic.DICDIR}"']
if os.path.exists(USER_DIC_BIN):
    mecab_args_parts += [f'-u "{USER_DIC_BIN}"']


def _try_init(args_str: str):
    try:
        t = MeCab.Tagger(args_str)
        print(f"MeCab initialized with args: {args_str}")
        return t
    except Exception as e:
        print(f"MeCab init failed with args ({args_str}): {e}")
        return None


mecab = None
if mecab_args_parts:
    # try full set first
    mecab = _try_init(" ".join(mecab_args_parts))

if mecab is None:
    # try without user dic
    parts_no_user = [p for p in mecab_args_parts if not p.startswith("-u")]
    if parts_no_user:
        mecab = _try_init(" ".join(parts_no_user))

if mecab is None:
    # try only with mecabrc
    if mecabrc_path:
        mecab = _try_init(f'-r "{mecabrc_path}"')

if mecab is None:
    # last resort: no args
    mecab = _try_init("")

if mecab is None:
    raise RuntimeError(
        "Failed initializing MeCab with any fallback options. See error messages above."
    )


# -----------------------------
# 形態素解析（draw.py 相当：名詞連結）
# -----------------------------
def mecab_tokenizer_user_only(text):
    text = unicodedata.normalize("NFKC", text)
    text = text.upper()
    text = re.sub(r"[【】 ()（）『』　「」]", "", text)
    text = re.sub(r"[\[\]［］]", " ", text)
    text = re.sub(r"[@＠]\w+", "", text)
    text = re.sub(r"\d+\.\d+", "", text)

    parsed = mecab.parse(text)
    if parsed is None:
        return ""

    tokens = []

    # 名詞を連結して1トークンにする（draw.py と同様）
    noun_buffer = []
    for line in parsed.split("\n"):
        if line == "EOS" or line.strip() == "":
            continue

        surface, feature = line.split("\t")
        features = feature.split(",")

        pos = features[0]

        # 名詞はバッファに貯める
        if pos == "名詞" and not surface.isdigit():
            noun_buffer.append(surface)
            continue

        # 名詞以外が来たら、貯めた名詞列を確定
        if noun_buffer:
            tokens.append("".join(noun_buffer))
            noun_buffer = []

    # 文末が名詞で終わった場合
    if noun_buffer:
        tokens.append("".join(noun_buffer))

    return " ".join(tokens)


with open("./create_wordcloud/non_food_words.json", "r", encoding="utf-8") as f:
    stoper = set(json.load(f))

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

# stopwords（draw.py 相当）
stopwords = stoper.union(set(prefectures)).union(set(search_words))
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
image_output_dir = "./scraping/wordcloud_images"
os.makedirs(image_output_dir, exist_ok=True)

# --- まず全県の word_counts を一時保存 ---
all_word_counts = {}

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
    word_counts = {
        w: int(c)
        for w, c in zip(words, counts)
        if w not in stopwords and not w.isdigit()
    }
    if not word_counts:
        continue

    all_word_counts[search_word] = word_counts

# --- 全体での最大出現頻度を求める ---
global_max = max(c for wc in all_word_counts.values() for c in wc.values())
print(f"全体の最大頻度: {global_max}")

# --- 正規化してWordCloud生成 ---
for search_word, word_counts in all_word_counts.items():
    normalized_word_counts = {w: c for w, c in word_counts.items()}

    # mac の標準フォント（環境により変わる可能性があるので必要なら差し替え）
    font_path = "/Library/Fonts/YuGothR.ttc"

    # draw.py の WordCloud 設定を、マスク無し生成にそのまま適用
    wordcloud = WordCloud(
        background_color="white",
        font_path=font_path,
        colormap="coolwarm",
        max_words=min(50, len(normalized_word_counts)),
        max_font_size=200,
        include_numbers=False,
        relative_scaling=0.5,
        min_font_size=0.1,
        color_func=lambda *args, **kwargs: "#000000",
    )

    try:
        wordcloud.generate_from_frequencies(normalized_word_counts)
    except ValueError:
        continue

    output_img_path = os.path.join(image_output_dir, f"{search_word}.png")
    wordcloud.to_file(output_img_path)
    print(f"{search_word} のワードクラウド画像保存: {output_img_path}")

print("🎉 全都道府県ワードクラウド生成完了")
