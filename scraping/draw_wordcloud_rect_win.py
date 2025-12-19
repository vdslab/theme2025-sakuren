import ctypes
import glob
import os
import re
import subprocess
import unicodedata

import ipadic
import MeCab
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from wordcloud import WordCloud

# -----------------------------
# MeCab DLL 読み込み（Windows向け）
# -----------------------------
LIBMECAB_PATH = r"C:\Program Files\MeCab\bin\libmecab.dll"
ctypes.cdll.LoadLibrary(LIBMECAB_PATH)

import ipadic
import MeCab

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

    for line in parsed.split("\n"):
        if line == "EOS" or line.strip() == "":
            continue

        surface, feature = line.split("\t")
        features = feature.split(",")

        pos = features[0]  # 品詞
        pos_detail = features[1]

        # ✅ 名詞・形容詞のみ
        if pos == "名詞" or pos == "形容詞":
            # 記号・数値っぽいもの除外
            if surface.isdigit():
                continue
            tokens.append(surface)

    return " ".join(tokens)


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
# stopwords 定義
stopwords = set(
    [
        "ーー",
        "店",
        "円",
        "味",
        "料理",
        "さん",
        "ランチ",
        "最高",
        "麺",
        "雰囲気",
        "丼",
        "定食",
        "メニュー",
        "満足",
        "注文",
        "人",
        "感じ",
        "店員",
        "普通",
        "セット",
        "2",
        "時",
        "酒",
        "方",
        "利用",
        "値段",
        "ご飯",
        "的",
        "時間",
        "スープ",
        "ボリューム",
        "量",
        "中",
        "屋",
        "こと",
        "訪問",
        "1",
        "コース",
        "放題",
        "店内",
        "牛",
        "一",
        "刺身",
        "ー",
        "接客",
        "ここ",
        "どれ",
        "日",
        "好き",
        "焼き",
        "野菜",
        "種類",
        "パ",
        "何",
        "感",
        "予約",
        "コス",
        "よう",
        "食事",
        "残念",
        "対応",
        "目",
        "3",
        "気",
        "個室",
        "そう",
        "席",
        "前",
        "豊富",
        "もの",
        "魚",
        "唐",
        "おすすめ",
        "パン",
        "駅",
        "今日",
        "提供",
        "笑",
        "これ",
        "丁寧",
        "サービス",
        "今回",
        "日本",
        "温泉",
        "お昼",
        "ごちそうさま",
        "隠岐",
        "来店",
        "近江",
        "琵琶湖",
        "購入",
        "綺麗",
        "ゴルフ",
        "会津",
        "白河",
        "仕事",
        "新鮮",
        "お腹",
        "来店",
        "久しぶり",
        "いっぱい",
        "ごちそうさま",
        "食堂",
        "購入",
        "家族",
        "絶品",
        "オーダー",
        "越前",
        "駐車",
        "300",
        "郡山",
        "飛騨",
        "500",
        "みたい",
        "好み",
        "100",
        "人気",
        "レストラン",
        "淡路島",
        "直島",
        "三盆",
        "奄美",
        "天草",
        "伊勢",
        "信州",
        "軽井沢",
        "大変",
        "平日",
        "五島",
        "佐世保",
        "島原",
        "中津",
        "別府",
        "スタッフ",
        "安定",
        "一一",
        "佐野",
        "伊豆",
        "阿波",
        "鳴門",
        "素材",
        "親切",
        "オススメ",
        "全部",
        "大山",
        "氷見",
        "美味しい",
        "美味しかっ",
        "美味し",
        "ない",
        "ところ",
        "それ",
        "こちら",
        "営業",
        "美味い",
        "なく",
        "美味しく",
        "良く",
        "近く",
        "自分",
        "ため",
        "到着",
        "それ",
        "カウンター",
        "テーブル",
        "お客",
        "カツ",
        "良かっ",
        "多い",
        "店舗",
        "嬉しい",
        "限定",
        "いい",
        "キヤ",
        "ラーメン",
        "次回",
        "途中",
        "追加",
        "写真",
        "コート",
        "フード",
        "見た目",
        "税込み",
        "なし",
        "最後",
        "ベース",
        "良い",
        "おいしかっ",
        "個人",
        "邪魔",
        "税込",
        "価格",
        "あと",
        "スガ",
        "通り",
        "以前",
        "印象",
    ]
    + prefectures
)

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

# --- 追加: まず全県の word_counts を一時保存 ---
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

    font_path = "C:/Windows/Fonts/YuGothR.ttc"
    # font_path = "/Library/Fonts/YuGothR.ttc"
    wordcloud = WordCloud(
        background_color="white",
        font_path=font_path,
        colormap="coolwarm",
        max_words=min(50, len(normalized_word_counts)),
        max_font_size=200,
        include_numbers=False,
        relative_scaling=0.7,
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
