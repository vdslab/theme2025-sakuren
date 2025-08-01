import ctypes
import json
import os
import re
import unicodedata
from collections import defaultdict

import ipadic
import MeCab
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# fmt: off
search_words_dict = {
    "aichi": "愛知県", "akita": "秋田県", "aomori": "青森県", "chiba": "千葉県", "ehime": "愛媛県", "fukui": "福井県", 
    "fukuoka": "福岡県", "fukushima": "福島県", "gifu": "岐阜県", "gunma": "群馬県", "hiroshima": "広島県", 
    "hokkaido": "北海道", "hyogo": "兵庫県", "ibaraki": "茨城県", "ishikawa": "石川県", "iwate": "岩手県", 
    "kagawa": "香川県", "kagoshima": "鹿児島県", "kanagawa": "神奈川県", "kochi": "高知県", "kumamoto": "熊本県", 
    "kyoto": "京都府", "mie": "三重県", "miyagi": "宮城県", "miyazaki": "宮崎県", "nagano": "長野県", 
    "nagasaki": "長崎県", "nara": "奈良県", "niigata": "新潟県", "oita": "大分県", "okayama": "岡山県", 
    "okinawa": "沖縄県", "osaka": "大阪県", "saga": "佐賀県", "saitama": "埼玉県", "shiga": "滋賀県", 
    "shimane": "島根県", "shizuoka": "静岡県", "tochigi": "栃木県", "tokushima": "徳島県", "tokyo": "東京都", 
    "tottori": "鳥取県", "toyama": "富山県", "wakayama": "和歌山県", "yamagata": "山形県", "yamaguchi": "山口県", 
    "yamanashi": "山梨県"
}
# stopwords 定義
stopwords = set( ["店","円","味","料理","さん","ラーメン","肉","ランチ","最高","そば","麺","雰囲気","丼","定食","メニュー","満足","注文","人","蕎麦","感じ","店員","普通","セット","2","時","酒","方","利用","うどん","値段","ご飯","的","時間","カレー","スープ","ボリューム","量","中","屋","こと","訪問","1","コース","放題","店内","牛","一","刺身","ー","接客","ここ","どれ","日","好き","焼き","味噌","野菜","種類","パ","天ぷら","何","感","予約","カツ","コス","よう","食事","残念","揚げ","対応","目","餃子","寿司","3","気","豚","個室","そう","席","塩","前","豊富","もの","魚","唐","チャーシュー","おすすめ","パン","駅","今日","醤油","中華","提供","笑","これ","丁寧","サービス","今回","コスパ","サラダ","日本","温泉", "お昼", "ごちそうさま", "隠岐", "来店", "近江", "琵琶湖", "購入", "綺麗", "ゴルフ", "会津", "白河", "限定", "仕事", "新鮮","お腹", "来店", "久しぶり", "台湾", "いっぱい", "ごちそうさま", "食堂", "購入", "家族", "絶品", "オーダー", "越前", "駐車", "300", "郡山", "飛騨", "500", "みたい", "好み", "100", "人気", "レストラン", "淡路島", "直島", "三盆", "奄美", "天草", "伊勢", "信州", "軽井沢", "大変", "平日", "五島", "佐世保", "島原", "替玉", "無料", "中津", "別府", "スタッフ", "安定", "ーー", "佐野", "伊豆", "阿波", "鳴門", "素材", "リーズナブル", "親切", "オススメ", "韓国", "価格", "居心地", "全部", "大山", "氷見", ] + [(p[:-1] if p != "北海道" else "北海道") for p in search_words_dict.values()])
# fmt: on

# MeCabの設定
mecab = MeCab.Tagger(ipadic.MECAB_ARGS)


def mecab_tokenizer(text):
    replaced_text = unicodedata.normalize("NFKC", text)
    replaced_text = replaced_text.upper()
    replaced_text = re.sub(r"[【】 ()（）『』　「」]", "", replaced_text)
    replaced_text = re.sub(r"[[［］]]", " ", replaced_text)
    replaced_text = re.sub(r"[@＠]\w+", "", replaced_text)
    replaced_text = re.sub(r"\d+\.\d+", "", replaced_text)

    parsed_lines = mecab.parse(replaced_text).split("\n")[:-2]
    surfaces = [l.split("\t")[0] for l in parsed_lines]
    pos = [l.split("\t")[1].split(",")[0] for l in parsed_lines]
    target_pos = ["名詞"]
    token_list = [t for t, p in zip(surfaces, pos) if p in target_pos]

    return " ".join(token_list)


def create_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)


def save_file(file_path, content):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(content, file, ensure_ascii=False)


def load_file(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        return file.read()


def calc_tfidf(texts):
    if texts[0] == "":
        return {}
    vectorizer = TfidfVectorizer(max_features=200)
    X = vectorizer.fit_transform(texts)
    words = vectorizer.get_feature_names_out()
    scores = np.asarray(X.mean(axis=0)).ravel()
    word_scores_raw = dict(zip(words, scores))

    word_scores = dict(
        sorted(word_scores_raw.items(), key=lambda x: x[1], reverse=True)
    )
    return {
        word: score
        for word, score in word_scores.items()
        if (word not in stopwords and not word.isdigit())
    }


tabelog_dir = "create_wordcloud/tabelog_results"
out_dir = "create_word_list/word_lists"

d = {}
# tabelog_results ディレクトリ内のフォルダをループ
for folder_name in os.listdir(tabelog_dir):
    folder_path = os.path.join(tabelog_dir, folder_name)
    if not os.path.isdir(folder_path):
        continue

    tmp = defaultdict(str)

    pref_name = search_words_dict[folder_name]
    pref_dict = {}
    pref_str = ""

    for file_name in os.listdir(folder_path):
        text = load_file(os.path.join(folder_path, file_name))
        pref_str += text + "\n"
        name = file_name.split(".")[0]
        if name.endswith(("市", "区")):
            tmp[name] = text
        else:
            tmp[name.split("郡")[0]] += text + "\n"

    for name, text in tmp.items():
        mecab_tokens = mecab_tokenizer(text)
        word_scores = calc_tfidf([mecab_tokens])

        pref_dict[name] = word_scores

    save_file(os.path.join(out_dir, f"{pref_name}.json"), pref_dict)
    mecab_tokens = mecab_tokenizer(pref_str)
    word_scores = calc_tfidf([mecab_tokens])
    d[pref_name] = word_scores

save_file(os.path.join(out_dir, "all.json"), d)
