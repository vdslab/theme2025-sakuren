import pandas as pd

# -----------------------------
# ユーザー辞書読み込み（部分一致で短い単語削除）
# -----------------------------
USER_DIC_CSV = "./create_word_list/food_dict.csv"

# CSVを読み込む（型は自動判定に任せる）
df = pd.read_csv(USER_DIC_CSV, header=None)

# 長い単語から順に並べる（検索効率のため）
df = df.sort_values(by=0, key=lambda x: x.astype(str).str.len(), ascending=False).reset_index(drop=True)

# 部分一致で短い単語を削除
to_remove = set()
for i, word_i in enumerate(df[0]):
    for j, word_j in enumerate(df[0]):
        if i == j:
            continue
        if str(word_j) in str(word_i):
            to_remove.add(word_j)

filtered_df = df[~df[0].isin(to_remove)].reset_index(drop=True)

# CSVに保持（任意）
filtered_df.to_csv("./create_wordcloud/filtered_food.csv", index=False, header=False, encoding="utf-8-sig")

# ワードクラウドで使う単語セット
user_words = set(filtered_df[0].tolist())

print(f"ユーザー辞書読み込み完了。{len(to_remove)} 件の部分一致単語を削除済み。")
print(f"残りの単語数: {len(filtered_df)} 件")
