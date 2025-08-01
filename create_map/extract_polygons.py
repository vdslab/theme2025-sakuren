import json
from collections import OrderedDict

cnt = int(input("ポリゴン数："))

# ファイルパス
municipalities_file = "./create_map/merge/merged.json"
result_file = "./create_wordcloud/result.json"
output_file = f"./create_map/extract_polygons_{cnt}.geojson"

# municipalities_merged.geojsonを読み込む
with open(municipalities_file, "r", encoding="utf-8") as f:
    municipalities_data = json.load(f)

# result.jsonを読み込む
with open(result_file, "r", encoding="utf-8") as f:
    result_data = json.load(f)

# result.jsonの冒頭300件の市区町村名を取得
municipality_names = {item[0] for item in result_data[:cnt]}
# 条件に合うfeaturesを抽出
filtered_features = [
    feature
    for feature in municipalities_data["features"]
    if feature["properties"].get("N03_003") in municipality_names
    or feature["properties"].get("N03_004") in municipality_names
]

# # 新しいGeoJSONデータを作成
# filtered_data = {"type": "FeatureCollection", "features": filtered_features}

# # extract_polygons.geojsonとして保存
# with open(output_file, "w", encoding="utf-8") as f:
#     json.dump(filtered_data, f, ensure_ascii=False)

# print(f"Filtered GeoJSON saved to {output_file}")

# 各featureのキー順を type, properties, geometry に並び替え
filtered_features = [
    OrderedDict(
        [
            ("type", feature.get("type")),
            ("properties", feature.get("properties")),
            ("geometry", feature.get("geometry")),
        ]
    )
    for feature in filtered_features
]

# 出力用GeoJSONのヘッダー
header = '{"type":"FeatureCollection","features":[\n'

# 各Featureを1行のJSON文字列として整形
features_lines = [
    json.dumps(f, ensure_ascii=False, separators=(",", ":"))
    for f in sorted(filtered_features, key=lambda x: x["properties"]["N03_007"])
]

# ,\nで区切る（各Featureが1行に）
features_body = ",\n".join(features_lines)

# フッター
footer = "\n]}\n"

# ファイルに書き出し
with open(output_file, "w", encoding="utf-8") as f:
    f.write(header)
    f.write(features_body)
    f.write(footer)

print(f"Filtered GeoJSON saved to {output_file}")
