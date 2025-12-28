import json
import geopandas as gpd
from shapely.geometry import shape

geojson_path = "./create_map/create_cartgram/N03-21_210101.json"

# === 1. GeoJSONを読み込み ===
with open(geojson_path, "r", encoding="utf-8") as f:
    data = json.load(f)

records = []
for f in data["features"]:
    props = f["properties"]
    geom = shape(f["geometry"])

    # --- 市/郡の名前補正 ---
    if props["N03_003"] is None or (
        props["N03_003"][-1] not in ["市", "郡"]
    ):
        name03 = props["N03_004"]
    else:
        name03 = props["N03_003"]

    records.append({
        "N03_001": props["N03_001"],
        "N03_003": name03,
        "geometry": geom
    })
    if(name03 in "伊達"):
        print(name03)

# === 2. GeoDataFrame を作る ===
gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")

# === 3. 市・郡単位で dissolve ===
merged = gdf.dissolve(by="N03_003", as_index=False)

# === 4. 結果を描画 ===
merged.plot(figsize=(10, 8), edgecolor="black")

# === 5. GeoJSONで保存 ===
output_path = "./create_map/create_cartgram/N03_merged_city.geojson"
merged.to_file(output_path, driver="GeoJSON")

print("保存しました:", output_path)