import pandas as pd
import numpy as np
import unicodedata
import MeCab
from collections import Counter
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import ipadic
import re
import csv
from PIL import Image
from sklearn.feature_extraction.text import TfidfVectorizer
import json

# MeCabの設定
mecab = MeCab.Tagger(ipadic.MECAB_ARGS)

# 前処理 + 形態素解析関数
def mecab_tokenizer(text):
    replaced_text = unicodedata.normalize("NFKC", text)
    replaced_text = replaced_text.upper()
    replaced_text = re.sub(r'[【】 () （） 『』　「」]', '', replaced_text)
    replaced_text = re.sub(r'[[［］]]', ' ', replaced_text)
    replaced_text = re.sub(r'[@＠]\w+', '', replaced_text)
    replaced_text = re.sub(r'\d+\.\d+', '', replaced_text)

    parsed_lines = mecab.parse(replaced_text).split("\n")[:-2]
    surfaces = [l.split("\t")[0] for l in parsed_lines]
    pos = [l.split("\t")[1].split(",")[0] for l in parsed_lines]
    target_pos = ["名詞"]
    token_list = [t for t, p in zip(surfaces, pos) if p in target_pos]

    return ' '.join(token_list)

# CSV読み込み & 各レビューを個別にトークン化
documents = []
with open('./create_wordcloud/results/tabelog_reviews_20250429_093539.csv', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    for row in reader:
        tokenized = mecab_tokenizer(row[0])
        documents.append(tokenized)

# TF-IDFベクトル計算
vectorizer = TfidfVectorizer(max_features=200)
X = vectorizer.fit_transform(documents)

# 単語とスコアの辞書を作成
words = vectorizer.get_feature_names_out()
scores = np.asarray(X.mean(axis=0)).ravel()
word_scores = dict(sorted(zip(words, scores), key=lambda x: x[1], reverse=True))

# WordCloud設定
font_path = "C:/Windows/Fonts/YuGothR.ttc"
colormap = "coolwarm"
mask = np.array(Image.open("./create_wordcloud/kagawa.png"))  # マスク画像がある場合

# WordCloud生成
wordcloud = WordCloud(
    background_color="white",
    width=800,
    height=800,
    font_path=font_path,
    colormap=colormap,
    stopwords=["讃岐","居酒屋","店","円","味","料理","さん","ラーメン","肉","ランチ","最高","そば","麺","雰囲気","丼","定食","メニュー","満足","注文","人","蕎麦","感じ","店員","普通","セット","2","時","酒","方","利用","うどん","値段","ご飯","的","時間","カレー","スープ","ボリューム","量","中","屋","こと","訪問","1","コース","放題","店内","牛","一","刺身","ー","接客","ここ","どれ","日","好き","焼き","味噌","野菜","種類","パ","天ぷら","何","感","予約","カツ","コス","よう","食事","残念","揚げ","対応","目","餃子","寿司","3","気","豚","個室","そう","席","塩","前","豊富","もの","魚","唐","チャーシュー","おすすめ","パン","駅","今日","醤油","中華","提供","笑","これ","丁寧","サービス","今回","コスパ","サラダ",],
    max_words=200,
    mask=mask
).generate_from_frequencies(word_scores)



# JSON出力用のレイアウト情報取得
word_layout_data = []
for (word, font_size, position, orientation, color) in wordcloud.layout_:
    word_info = {
        "word": word,
        "tfidf_score": word_scores.get(word, 0),
        "font_size": font_size,
        "x": round(float(position[1]), 6),              # 高精度 → 小数第6位まで
        "y": round(float(position[0]), 6),
        "orientation": orientation,
        "color": color
    }
    print(word_info)
    word_layout_data.append(word_info)


# JSONファイルとして保存
with open("wordcloud_layout.json", "w", encoding="utf-8") as f:
    json.dump(word_layout_data, f, ensure_ascii=False, indent=2)

# 画像表示
plt.figure(figsize=(10, 10))
plt.imshow(wordcloud, interpolation="bilinear")
plt.axis("off")
plt.show()