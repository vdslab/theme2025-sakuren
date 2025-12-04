import json
import geopandas as gpd
from shapely.geometry import shape, Polygon, MultiPolygon

geojson_path = "./create_map/create_cartgram/N03-21_210101.json"

# === 1. GeoJSON読み込み ===
with open(geojson_path, "r", encoding="utf-8") as f:
    data = json.load(f)

records = []
for f in data["features"]:
    props = f["properties"]
    geom = shape(f["geometry"])

    # 市/郡の名前補正
    if props["N03_003"] is None or props["N03_003"][-1] not in ["市", "郡"]:
        name03 = props["N03_004"]
    else:
        name03 = props["N03_003"]

    records.append({
        "N03_001": props["N03_001"],  # 県コード
        "N03_003": name03,
        "geometry": geom
    })

gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")

# === 2. 投影座標系に変換（面積計算用） ===
gdf = gdf.to_crs(epsg=3857)

# === 3. 県ごとに dissolve ===
pref_gdf = gdf.dissolve(by="N03_001", as_index=False)

# === 4. 県ポリゴンから極小離島削除 ===
def drop_islands_keep_largest(geom):
    if isinstance(geom, Polygon):
        return geom
    if isinstance(geom, MultiPolygon):
        largest = max(geom.geoms, key=lambda p: p.area)
        return largest
    return None

pref_gdf["geometry"] = pref_gdf["geometry"].apply(drop_islands_keep_largest)

# === 5. 市区町村レベルに戻す（空間結合） ===
gdf = gdf.sjoin(pref_gdf[["N03_001", "geometry"]], how="inner", predicate="within")
gdf = gdf.drop(columns="index_right")

# === 6. 市・郡単位で dissolve ===
merged = gdf.dissolve(by=["N03_001_left", "N03_003"], as_index=False)

# === 7. 緯度経度に戻す ===
merged = merged.to_crs(epsg=4326)

merged = merged.reset_index(drop=True)
merged["N03_007"] = merged.index
# === 8. 描画・保存 ===
merged.plot(figsize=(10, 8), edgecolor="black")
output_path = "./create_map/create_cartgram/N03_merged_city_no_islands.geojson"
merged.to_file(output_path, driver="GeoJSON")

print("保存しました:", output_path)
