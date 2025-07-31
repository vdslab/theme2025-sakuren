import pandas as pd

excel_path = "./a202.xls"
df = pd.read_excel(excel_path, header=11)

# 列名の空白と改行を除去
df.columns = df.columns.str.strip()
df.columns = df.columns.str.replace('\n', '')

print(df.columns.tolist())  # 確認

# 例：実際の列名に合わせて置き換え
df_selected = df[[
    '都道府県',  # 都道府県
    '指標値 Indicator.5',  # 年平均気温？適宜置き換え
    '指標値 Indicator.10',  # 年平均湿度？
]]

df_selected.columns = ['都道府県', 'avg_temperature', 'Yearly precipitation']

df_selected.to_json("weather_by_prefecture.json", orient="records", force_ascii=False)
print("✅ weather_by_prefecture.json を出力しました")
