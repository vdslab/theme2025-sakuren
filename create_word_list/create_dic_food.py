import pandas as pd
import re
import csv

# --- 設定 ---
excel_path = (
    "./create_word_list/20201225-mxt_kagsei-mext_01110_012.xlsx"  # Excelファイル
)
output_csv = "food_dict.csv"

# --- Excelの読み込み ---
# ヘッダー行が長い場合、header=None で全部データとして読み込む
df_sheets = pd.read_excel(excel_path, sheet_name=None, header=11)

food_names = set()

for sheet_name, sheet in df_sheets.items():
    # ここで列番号を指定（例: 2列目が食品名）
    foods_series = sheet.iloc[:, 3].dropna().astype(str)

    for food in foods_series:
        # スペースで区切って複数単語を分離
        for f in food.split("\u3000"):
            f = re.sub(r"[【】 ()（）『』　「」]", "", f)
            f = f.strip()  # 前後の空白を除去
            if f:  # 空文字でなければ追加
                food_names.add(f)

print(f"抽出した食品名数: {len(food_names)}")

# --- MeCab辞書CSV作成 ---
with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    for food in sorted(food_names):
        writer.writerow(
            [
                food,  # 表層形
                1285,
                1285,
                5000,  # 左右文脈ID, コスト
                "名詞",
                "一般",
                "*",
                "*",
                "*",
                "*",
                food,  # 原形
                food,  # 読み
                food,  # 発音
            ]
        )

print(f"✅ MeCab用食品辞書CSVを出力しました: {output_csv}")
