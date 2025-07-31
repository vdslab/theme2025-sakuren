import os
import glob
import unicodedata
import re
import numpy as np
import MeCab
import ipadic
from sklearn.feature_extraction.text import TfidfVectorizer
import json

# ---------------------------------------------
# ① MeCabの準備
# ---------------------------------------------
mecab = MeCab.Tagger(ipadic.MECAB_ARGS)

def mecab_tokenizer(text):
    replaced_text = unicodedata.normalize("NFKC", text)
    replaced_text = replaced_text.upper()
    replaced_text = re.sub(r'[【】()（）『』「」　]', '', replaced_text)
    replaced_text = re.sub(r'［］', ' ', replaced_text)
    replaced_text = re.sub(r'[@＠]\w+', '', replaced_text)
    replaced_text = re.sub(r'\d+\.\d+', '', replaced_text)

    parsed_lines = mecab.parse(replaced_text).split("\n")[:-2]
    surfaces = [l.split("\t")[0] for l in parsed_lines]
    pos = [l.split("\t")[1].split(",")[0] for l in parsed_lines]
    target_pos = ["名詞"]  # 必要に応じて ["名詞", "形容詞"] に変更可
    token_list = [t for t, p in zip(surfaces, pos) if p in target_pos and len(t) > 1]

    return ' '.join(token_list)

# ---------------------------------------------
# ② 都道府県名とローマ字フォルダ名の対応表（全47都道府県）
# ---------------------------------------------
pref_map = {
    "北海道": "hokkaido",
    "青森県": "aomori",
    "岩手県": "iwate",
    "宮城県": "miyagi",
    "秋田県": "akita",
    "山形県": "yamagata",
    "福島県": "fukushima",
    "茨城県": "ibaraki",
    "栃木県": "tochigi",
    "群馬県": "gunma",
    "埼玉県": "saitama",
    "千葉県": "chiba",
    "東京都": "tokyo",
    "神奈川県": "kanagawa",
    "新潟県": "niigata",
    "富山県": "toyama",
    "石川県": "ishikawa",
    "福井県": "fukui",
    "山梨県": "yamanashi",
    "長野県": "nagano",
    "岐阜県": "gifu",
    "静岡県": "shizuoka",
    "愛知県": "aichi",
    "三重県": "mie",
    "滋賀県": "shiga",
    "京都府": "kyoto",
    "大阪府": "osaka",
    "兵庫県": "hyogo",
    "奈良県": "nara",
    "和歌山県": "wakayama",
    "鳥取県": "tottori",
    "島根県": "shimane",
    "岡山県": "okayama",
    "広島県": "hiroshima",
    "山口県": "yamaguchi",
    "徳島県": "tokushima",
    "香川県": "kagawa",
    "愛媛県": "ehime",
    "高知県": "kochi",
    "福岡県": "fukuoka",
    "佐賀県": "saga",
    "長崎県": "nagasaki",
    "熊本県": "kumamoto",
    "大分県": "oita",
    "宮崎県": "miyazaki",
    "鹿児島県": "kagoshima",
    "沖縄県": "okinawa"
}

# ---------------------------------------------
# ③ TF-IDF処理＆JSON化
# ---------------------------------------------
output_json_path = "wordcloud_layout.json"
all_layouts = []

for pref_name, folder_name in pref_map.items():
    txt_dir = f'./create_wordcloud/tabelog_results/{folder_name}'
    documents = []

    for filepath in glob.glob(os.path.join(txt_dir, '*.txt')):
        with open(filepath, encoding='utf-8') as f:
            text = f.read()
            tokenized = mecab_tokenizer(text)
            documents.append(tokenized)

    if not documents:
        print(f"⚠️ テキストが見つかりません: {pref_name}")
        continue

    # TF-IDFベクトル作成
    vectorizer = TfidfVectorizer(max_features=200)
    X = vectorizer.fit_transform(documents)

    words = vectorizer.get_feature_names_out()
    scores = np.asarray(X.mean(axis=0)).ravel()
    word_scores = dict(sorted(zip(words, scores), key=lambda x: x[1], reverse=True))

    # JSON用データ
    word_layout_data = [
        {"word": word, "tfidf_score": round(word_scores[word], 6)}
        for word in words
    ]

    word_layout = {
        "name": pref_name,
        "data": word_layout_data
    }

    all_layouts.append(word_layout)
    print(f"✅ 完了: {pref_name}（{len(words)}語）")

# ---------------------------------------------
# ④ JSONとして保存
# ---------------------------------------------
with open(output_json_path, "w", encoding="utf-8") as f:
    json.dump(all_layouts, f, ensure_ascii=False, indent=2)

print(f"\n✅ 全都道府県のTF-IDF処理が完了しました。出力先: {output_json_path}")
