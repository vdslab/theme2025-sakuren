import os
import re
import unicodedata
from collections import defaultdict

import ipadic
import matplotlib.pyplot as plt
import MeCab
from wordcloud import WordCloud

mecab = MeCab.Tagger(ipadic.MECAB_ARGS)

# fmt: off
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
stop_words = ["店","円","味","料理","さん","ラーメン","肉","ランチ","最高","そば","麺","雰囲気","丼","定食","メニュー","満足","注文","人","蕎麦","感じ","店員","普通","セット","2","時","酒","方","利用","うどん","値段","ご飯","的","時間","カレー","スープ","ボリューム","量","中","屋","こと","訪問","1","コース","放題","店内","牛","一","刺身","ー","接客","ここ","どれ","日","好き","焼き","味噌","野菜","種類","パ","天ぷら","何","感","予約","カツ","コス","よう","食事","残念","揚げ","対応","目","餃子","寿司","3","気","豚","個室","そう","席","塩","前","豊富","もの","魚","唐","チャーシュー","おすすめ","パン","駅","今日","醤油","中華","提供","笑","これ","丁寧","サービス","今回","コスパ","サラダ","日本","温泉", "お昼", "ごちそうさま", "隠岐", "来店", "近江", "琵琶湖", "購入", "綺麗", "ゴルフ", "会津", "白河", "限定", "仕事", "新鮮","お腹", "来店", "久しぶり", "台湾", "いっぱい", "ごちそうさま", "食堂", "購入", "家族", "絶品", "オーダー", "越前", "駐車", "300", "郡山", "飛騨", "500", "みたい", "好み", "100", "人気", "レストラン", "淡路島", "直島", "三盆", "奄美", "天草", "伊勢", "信州", "軽井沢", "大変", "平日", "五島", "佐世保", "島原", "替玉", "無料", "中津", "別府", "スタッフ", "安定", "一一", "佐野", "伊豆", "阿波", "鳴門", "素材", "リーズナブル", "親切", "オススメ", "韓国", "価格", "居心地", "全部", "大山", "氷見", ] + prefectures
# fmt: on
stop_words_dict = defaultdict(int)


def load_file(path):
    with open(path, "r", encoding="utf-8") as file:
        return file.read()


def create_folder(path):
    if not os.path.exists(path):
        os.makedirs(path)


def add_stop_words(words):
    for word in words:
        stop_words_dict[word] += 1


def get_stop_words():
    limit = 100

    words = stop_words_dict.items()
    stop_words = sorted(words, key=lambda x: x[1], reverse=True)[:limit]

    return [v[0] for v in stop_words]


def mecab_tokenizer(text):
    replaced_text = unicodedata.normalize("NFKC", text)
    replaced_text = replaced_text.upper()
    replaced_text = re.sub(r"[【】 () （） 『』　「」]", "", replaced_text)
    replaced_text = re.sub(r"[\[\［\］]", " ", replaced_text)
    replaced_text = re.sub(r"[@＠]\w+", "", replaced_text)
    replaced_text = re.sub(r"\d+.\d", "", replaced_text)

    parsed_lines = mecab.parse(replaced_text).split("\n")[:-2]
    surfaces = [l.split("\t")[0] for l in parsed_lines]
    pos = [l.split("\t")[1].split(",")[0] for l in parsed_lines]
    target_pos = ["名詞"]
    token_list = [t for t, p in zip(surfaces, pos) if p in target_pos]

    kana_re = re.compile("^[ぁ-ゖ]+$")
    token_list = [t for t in token_list if not (len(t) == 1 or  kana_re.match(t) or  t.isdecimal())]
    # add_stop_words(token_list)
    return " ".join(token_list)


def create_wordcloud(text, file_path):
    colormap = "coolwarm"

    wordcloud = WordCloud(
        background_color="white",
        width=800,
        height=800,
        font_path="/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc",
        colormap=colormap,
        stopwords=stop_words,
        max_words=400,
    ).generate(text)

    plt.figure(figsize=(10, 10))
    plt.imshow(wordcloud, interpolation="bilinear")
    plt.axis("off")
    plt.savefig(file_path)
    plt.close()


def main():
    data_folder_path = "./tabelog_results"
    output_folder_base_path = "./tabelog_wordcloud_auto_limit"

    folder_names = [
        name
        for name in os.listdir(data_folder_path)
        if os.path.isdir(os.path.join(data_folder_path, name))
    ]

    for folder_name in sorted(folder_names):
        pref_text = ""
        inner_folder_path = os.path.join(data_folder_path, folder_name)
        file_names = [
            name
            for name in os.listdir(inner_folder_path)
            if os.path.isfile(os.path.join(inner_folder_path, name))
        ]

        output_folder_path = os.path.join(output_folder_base_path, folder_name)
        create_folder(output_folder_path)
        for file_name in sorted(file_names):
            file_path = os.path.join(inner_folder_path, file_name)
            text = load_file(file_path)

            if text != "":
                pref_text += text
                tokenized_text = mecab_tokenizer(text)

                output_file_path = os.path.join(output_folder_path, f"{file_name}.png")
                create_wordcloud(tokenized_text, output_file_path)

        pref_tokenized_text = mecab_tokenizer(pref_text)
        pref_output_file_path = os.path.join(output_folder_path, f"{folder_name}.png")
        create_wordcloud(pref_tokenized_text, pref_output_file_path)

        print(folder_name)


if __name__ == "__main__":
    main()

# print(get_stop_words())
