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

prefectures = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野",
    "岐阜", "静岡", "愛知", "三重",
    "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山",
    "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知",
    "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄",
]
# stopwords 定義
stopwords = set( ["店","円","味","料理","さん","ラーメン","肉","ランチ","最高","そば","麺","雰囲気","丼","定食","メニュー","満足","注文","人","蕎麦","感じ","店員","普通","セット","2","時","酒","方","利用","うどん","値段","ご飯","的","時間","カレー","スープ","ボリューム","量","中","屋","こと","訪問","1","コース","放題","店内","牛","一","刺身","ー","接客","ここ","どれ","日","好き","焼き","味噌","野菜","種類","パ","天ぷら","何","感","予約","カツ","コス","よう","食事","残念","揚げ","対応","目","餃子","寿司","3","気","豚","個室","そう","席","塩","前","豊富","もの","魚","唐","チャーシュー","おすすめ","パン","駅","今日","醤油","中華","提供","笑","これ","丁寧","サービス","今回","コスパ","サラダ","日本","温泉", "お昼", "ごちそうさま", "隠岐", "来店", "近江", "琵琶湖", "購入", "綺麗", "ゴルフ", "会津", "白河", "限定", "仕事", "新鮮","お腹", "来店", "久しぶり", "台湾", "いっぱい", "ごちそうさま", "食堂", "購入", "家族", "絶品", "オーダー", "越前", "駐車", "300", "郡山", "飛騨", "500", "みたい", "好み", "100", "人気", "レストラン", "淡路島", "直島", "三盆", "奄美", "天草", "伊勢", "信州", "軽井沢", "大変", "平日", "五島", "佐世保", "島原", "替玉", "無料", "中津", "別府", "スタッフ", "安定", "一一", "佐野", "伊豆", "阿波", "鳴門", "素材", "リーズナブル", "親切", "オススメ", "韓国", "価格", "居心地", "全部", "大山", "氷見", ] + prefectures)

# 画像保存ディレクトリ
image_output_dir = "./wordcloud_images"
os.makedirs(image_output_dir, exist_ok=True)
# 都道府県リスト
search_words = [
    "愛知県", "秋田県", "青森県", "千葉県", "愛媛県", "福井県", "福岡県", "福島県", "岐阜県", "群馬県", "広島県", "北海道", "兵庫県",
    "茨城県", "石川県", "岩手県", "香川県", "鹿児島県", "神奈川県", "高知県", "熊本県", "京都府", "三重県", "宮城県", "宮崎県",
    "長野県", "長崎県", "奈良県", "新潟県", "大分県", "岡山県", "沖縄県", "大阪府", "佐賀県", "埼玉県", "滋賀県", "島根県",
    "静岡県", "栃木県", "徳島県", "東京都", "鳥取県", "富山県", "和歌山県", "山形県", "山口県", "山梨県"
]
search_words_roma = [
    "aichi", "akita", "aomori", "chiba", "ehime", "fukui", "fukuoka", "fukushima", "gifu", "gunma", "hiroshima", "hokkaido", "hyogo",
    "ibaraki", "ishikawa", "iwate", "kagawa", "kagoshima", "kanagawa", "kochi", "kumamoto", "kyoto", "mie", "miyagi", "miyazaki",
    "nagano", "nagasaki", "nara", "niigata", "oita", "okayama", "okinawa", "osaka", "saga", "saitama", "shiga", "shimane",
    "shizuoka", "tochigi", "tokushima", "tokyo", "tottori", "toyama", "wakayama", "yamagata", "yamaguchi", "yamanashi"
]

# 全都道府県ループ
for i in range(len(search_words)):
    search_word = search_words[i]
    search_word_roma = search_words_roma[i]

    txt_dir = f'./create_wordcloud/tabelog_results/{search_word_roma}'

    documents = []
    for filepath in glob.glob(os.path.join(txt_dir, '*.txt')):
        with open(filepath, encoding='utf-8') as f:
            text = f.read()
            tokenized = mecab_tokenizer(text)
            documents.append(tokenized)

    print(f"読み込んだテキストファイル数: {len(documents)}")
    print(search_word, search_word_roma)

    # TF-IDF 計算（+ stopwords 除去）
    vectorizer = TfidfVectorizer(max_features=200)
    X = vectorizer.fit_transform(documents)
    words = vectorizer.get_feature_names_out()
    scores = np.asarray(X.mean(axis=0)).ravel()
    word_scores_raw = dict(zip(words, scores))

    # stopwords除去
    filtered_scores = {
        word: score for word, score in word_scores_raw.items()
        if word not in stopwords and not word.isdigit()
    }

    # 上位10語だけを選択
    top_words = dict(sorted(filtered_scores.items(), key=lambda x: x[1], reverse=True)[:5])

    # マスク画像読み込み
    mask_path = f'./prefecture_layer/{search_word}/{search_word}.png'
    mask_image = Image.open(mask_path).convert("L")
    mask_array = np.array(mask_image)

    mask_indices = np.where(mask_array < 128)
    if mask_indices[0].size == 0 or mask_indices[1].size == 0:
        raise ValueError(f"マスク画像に有効な領域がありません: {search_word}")

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
        max_words=10,
        mask=mask_array,
        scale=10,                   # 高解像度で詰めやすく
        relative_scaling=0.4,      # サイズ差を控えめにして詰まりやすく
        prefer_horizontal=1,    # 横方向配置を優先
    ).generate_from_frequencies(top_words)
    

    # JSONレイアウトデータ作成
    word_layout_data = {"name": search_word, "data": []}

    for (word, font_size, position, orientation, color) in wordcloud.layout_:
        abs_x = float(position[1])
        abs_y = float(position[0])
        rel_x = abs_x - min_x_offset
        rel_y = abs_y - min_y_offset
        norm_x = rel_x / (max_x_offset - min_x_offset)
        norm_y = rel_y / (max_y_offset - min_y_offset)

        word_info = {
            "word": word[0],
            "tfidf_score": top_words.get(word[0], 0),
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
    json_path = "wordcloud_layout.json"
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
    else:
        existing_data = []

    existing_data.append(word_layout_data)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

    print(f"✅ {search_word} のレイアウトデータを保存しました。")

print("🎉 全都道府県のワードクラウドレイアウト生成完了")
