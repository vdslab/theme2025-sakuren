import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon, Point
import numpy as np
import math
import os
import json
import matplotlib.pyplot as plt
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union
# === 1. GeoJSONを読み込む ===
gdf = gpd.read_file("./create_map/create_tilegram/jp_cartogram.geojson")

# === 2. 投影座標系に変換（緯度経度を平面座標に） ===
gdf = gdf.to_crs("EPSG:3857")
# === 3. MultiPolygonをPolygon単位に分解 ===
polygons, names01, names03 = [], [],[]

for _, row in gdf.iterrows():
    geom = row.geometry
    name01 = row["N03_001"]
    name03 = row["N03_003"]
    if isinstance(geom, Polygon):
        polygons.append(geom)
        names01.append(name01)
        names03.append(name03)
    elif isinstance(geom, MultiPolygon):
        for poly in geom.geoms:
            polygons.append(poly)
            names01.append(name01)
            names03.append(name03)
gdf_polygons = gpd.GeoDataFrame(
    {"N03_001": names01, "N03_003": names03}, geometry=polygons, crs=gdf.crs
)

# === 4. 六角形タイル設定 ===
tile_area = 1e8  # タイル1枚あたりの面積
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
hexes, owners01, owners03 = [], [], []

radius = a * 0.8  # 半径をタイルサイズに合わせて調整

for cx, cy in centers:
    p = Point(cx, cy)
    circle = p.buffer(radius)  # 円形領域（bufferで生成）

    best_pref01 = None
    best_pref03 = None
    best_overlap_area = 0

    for idx, geom in enumerate(gdf_polygons.geometry):
        overlap_area = geom.intersection(circle).area
        if overlap_area > best_overlap_area:
            best_overlap_area = overlap_area
            best_pref01 = gdf_polygons.iloc[idx]["N03_001"]
            best_pref03 = gdf_polygons.iloc[idx]["N03_003"]

    # 最も多く円にかぶっている県に所属させる
    if best_pref01 is not None:
        coords = hexagon_coords(cx, cy, a)
        hexes.append(Polygon(coords))
        owners01.append(best_pref01)
        owners03.append(best_pref03)

hex_gdf = gpd.GeoDataFrame(
    {"N03_001": owners01, "N03_003": owners03}, geometry=hexes, crs="EPSG:3857"
)

# === 8. 市区町村ごとに六角形を結合 ===
fixed1 = hex_gdf.copy()
fixed2 = hex_gdf.copy()

fixed1["geometry"] = fixed1.buffer(0.5)
fixed2["geometry"] = fixed2.buffer(0.5)

todouhuken_gdf = fixed1.groupby("N03_001")["geometry"].apply(unary_union)
todouhuken_gdf = gpd.GeoDataFrame(todouhuken_gdf, geometry="geometry").reset_index()

# groupby で作成した GeoDataFrame
sikutyoson_gdf = fixed2.groupby("N03_003")["geometry"].apply(unary_union)
sikutyoson_gdf = gpd.GeoDataFrame(
    sikutyoson_gdf, geometry="geometry"
).reset_index()
pref_map = hex_gdf.groupby("N03_003")["N03_001"].first().to_dict()
sikutyoson_gdf["N03_001"] = sikutyoson_gdf["N03_003"].map(pref_map)

# === 9. GeoJSONとして出力 ===
os.makedirs("./public", exist_ok=True)
sikutyoson_gdf.to_file(
    "./public/pref_hex_merged_sikutyoson.geojson", driver="GeoJSON", encoding="utf-8"
)
todouhuken_gdf.to_file(
    "./public/pref_hex_merged_todouhuken.geojson", driver="GeoJSON", encoding="utf-8"
)


# === 11. 描画 ===
fig, ax = plt.subplots(figsize=(10, 10))
todouhuken_gdf.plot(
    column="N03_001", ax=ax, edgecolor="black", linewidth=0.8, alpha=0.7
)
sikutyoson_gdf.plot(
    column="N03_003", ax=ax, edgecolor="black", linewidth=0.8, alpha=0.7
)
plt.title("都道府県ごとに結合された六角形タイル図", fontsize=14)
plt.axis("off")
plt.show()
