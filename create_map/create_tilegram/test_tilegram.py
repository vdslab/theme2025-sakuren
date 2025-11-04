import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon, Point
import numpy as np
import math
import os
import json
import matplotlib.pyplot as plt

# === 1. GeoJSONを読み込む ===
gdf = gpd.read_file("./public/cartogram_lonlat2.geojson")
pref_col = "name"  # 都道府県名の列名

# === 2. 投影座標系に変換（緯度経度を平面座標に） ===
gdf = gdf.to_crs("EPSG:3857")
# === 3. MultiPolygonをPolygon単位に分解 ===
polygons, names = [], []
for _, row in gdf.iterrows():
    geom = row.geometry
    name = row[pref_col]
    if isinstance(geom, Polygon):
        polygons.append(geom)
        names.append(name)
    elif isinstance(geom, MultiPolygon):
        for poly in geom.geoms:
            polygons.append(poly)
            names.append(name)

gdf_polygons = gpd.GeoDataFrame({"pref_name": names}, geometry=polygons, crs=gdf.crs)

# === 4. 六角形タイル設定 ===
tile_area = 7e7  # タイル1枚あたりの面積
a = math.sqrt(2 * tile_area / (3 * math.sqrt(3)))  # 六角形の1辺の長さ
tile_spacingX = 3 * a / 2
tile_spacingY = math.sqrt(3) * a

# === 5. 六角形中心点のグリッドを作成 ===
minx, miny, maxx, maxy = gdf_polygons.total_bounds
centers = []
for ix, x in enumerate(np.arange(minx, maxx, tile_spacingX)):
    for iy, y in enumerate(np.arange(miny, maxy, tile_spacingY)):
        y_offset = tile_spacingY / 2 if ix % 2 == 1 else 0
        centers.append((x, y + y_offset))


# === 6. 六角形生成関数 ===
def hexagon_coords(cx, cy, a):
    angles = [0, 60, 120, 180, 240, 300]
    pts = [
        (cx + a * math.cos(math.radians(t)), cy + a * math.sin(math.radians(t)))
        for t in angles
    ]
    pts.append(pts[0])
    return pts


# === 7. 各六角形がどの都道府県に属するか判定 ===
hexes, owners = [], []
for cx, cy in centers:
    p = Point(cx, cy)
    for idx, geom in enumerate(gdf_polygons.geometry):
        if geom.contains(p):
            coords = hexagon_coords(cx, cy, a)
            hexes.append(Polygon(coords))
            owners.append(gdf_polygons.iloc[idx]["pref_name"])
            break

hex_gdf = gpd.GeoDataFrame({"pref_name": owners}, geometry=hexes, crs="EPSG:3857")

# === 8. 都道府県ごとに六角形を結合 ===
merged_gdf = hex_gdf.dissolve(by="pref_name").reset_index()

# === 9. GeoJSONとして出力 ===
os.makedirs("./public", exist_ok=True)
output_path = "./public/pref_hex_merged.geojson"
merged_gdf.to_file(output_path, driver="GeoJSON", encoding="utf-8")

# === 10. idを都道府県名に設定 ===
with open(output_path, encoding="utf-8") as f:
    data = json.load(f)

for feature in data["features"]:
    pref_name = feature["properties"]["pref_name"]
    feature["id"] = pref_name

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✅ 出力完了: {output_path}")

# === 11. 描画 ===
fig, ax = plt.subplots(figsize=(10, 10))
merged_gdf.plot(column="pref_name", ax=ax, edgecolor="black", linewidth=0.8, alpha=0.7)
plt.title("都道府県ごとに結合された六角形タイル図", fontsize=14)
plt.axis("off")
plt.show()
