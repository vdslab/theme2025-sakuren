import MeCab
import unicodedata
import re
import ipadic
import json
from collections import defaultdict
import os
import glob


# MeCabの設定
mecab = MeCab.Tagger(ipadic.MECAB_ARGS)
# 都道府県リスト
search_words_dict = {
    "愛知県": "aichi",
    "秋田県": "akita",
    "青森県": "aomori",
    "千葉県": "chiba",
    "愛媛県": "ehime",
    "福井県": "fukui",
    "福岡県": "fukuoka",
    "福島県": "fukushima",
    "岐阜県": "gifu",
    "群馬県": "gunma",
    "広島県": "hiroshima",
    "北海道": "hokkaido",
    "兵庫県": "hyogo",
    "茨城県": "ibaraki",
    "石川県": "ishikawa",
    "岩手県": "iwate",
    "香川県": "kagawa",
    "鹿児島県": "kagoshima",
    "神奈川県": "kanagawa",
    "高知県": "kochi",
    "熊本県": "kumamoto",
    "京都府": "kyoto",
    "三重県": "mie",
    "宮城県": "miyagi",
    "宮崎県": "miyazaki",
    "長野県": "nagano",
    "長崎県": "nagasaki",
    "奈良県": "nara",
    "新潟県": "niigata",
    "大分県": "oita",
    "岡山県": "okayama",
    "沖縄県": "okinawa",
    "大阪府": "osaka",
    "佐賀県": "saga",
    "埼玉県": "saitama",
    "滋賀県": "shiga",
    "島根県": "shimane",
    "静岡県": "shizuoka",
    "栃木県": "tochigi",
    "徳島県": "tokushima",
    "東京都": "tokyo",
    "鳥取県": "tottori",
    "富山県": "toyama",
    "和歌山県": "wakayama",
    "山形県": "yamagata",
    "山口県": "yamaguchi",
    "山梨県": "yamanashi",
}


# 形態素解析＋前処理関数
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

    return token_list


data_dict = defaultdict(defaultdict)
base_dir = "./create_wordcloud/tabelog_results"

for search_word, search_words_alfa in search_words_dict.items():
    data_dict[search_word] = defaultdict(list)
    dir = f"{base_dir}/{search_words_alfa}"
    print(search_word)
    for file_path in glob.glob(os.path.join(dir, "*.txt")):
        municipality = os.path.splitext(os.path.basename(file_path))[0]
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
            tokens = mecab_tokenizer(content)
            if "郡" in municipality:
                municipality = municipality.split("郡")[0] + "郡"
            data_dict[search_word][municipality] += tokens

print("データ収集完了")

li = []
for k, v in data_dict.items():
    for kv in v.items():
        li.append([k, *kv])

print("データ整理完了")
result = [[i[0], i[1], len(i[2])] for i in li]

output_file = "./create_wordcloud/result_fix.json"
result = sorted(result, key=lambda x: x[2], reverse=True)
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=4)

print(f"結果を {output_file} に保存しました")
