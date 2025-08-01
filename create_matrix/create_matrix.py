import json
import numpy as np
from collections import defaultdict

# JSONファイルをまとめて読み込み
with open("./public/data/wordcloud_layout.json", "r", encoding="utf-8") as f:
    all_pref_data = json.load(f)

# 全単語セットを収集
vocab_set = set()
for pref in all_pref_data:
    for wd in pref["data"]:
        vocab_set.add(wd["word"])
vocab = sorted(list(vocab_set))
word2idx = {w: i for i, w in enumerate(vocab)}

# 共起行列（単語数×単語数）初期化
size = len(vocab)
cooccurrence = np.zeros((size, size), dtype=int)

# 各県の単語集合を作り、その中で全単語ペアに+1する
for pref in all_pref_data:
    words_in_pref = set(wd["word"] for wd in pref["data"])
    words_list = list(words_in_pref)
    n = len(words_list)
    for i in range(n):
        for j in range(i+1, n):
            idx_i = word2idx[words_list[i]]
            idx_j = word2idx[words_list[j]]
            cooccurrence[idx_i, idx_j] += 1
            cooccurrence[idx_j, idx_i] += 1  # 対称

# 出力用辞書
output = {
    "vocab": vocab,
    "cooccurrence_matrix": cooccurrence.tolist()
}

# 保存
with open("cooccurrence_matrix_all_pref.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("✅ 全県まとめた共起（隣接）行列をcooccurrence_matrix_all_pref.jsonに保存しました。")
