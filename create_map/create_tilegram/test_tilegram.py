import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon, Point
import numpy as np
import math
import os
import matplotlib.pyplot as plt
from shapely.ops import unary_union

# === 1. GeoJSONを読み込む ===
gdf = gpd.read_file("./create_map/create_tilegram/jp_cartogram.geojson")

# === 2. 投影座標系に変換（緯度経度を平面座標に） ===
gdf = gdf.to_crs("EPSG:3857")

# === 3. MultiPolygonをPolygon単位に分解 ===
polygons, names01, names03 = [], [], []
for _, row in gdf.iterrows():
    geom = row.geometry
    name01 = row["N03_001_left"]
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
tile_area = 5e8
a = math.sqrt(2 * tile_area / (3 * math.sqrt(3)))  # 六角形1辺
tile_spacingX = 3 * a / 2
tile_spacingY = math.sqrt(3) * a

# === 5. 六角形中心点のグリッド作成 ===
minx, miny, maxx, maxy = gdf_polygons.total_bounds
centers = []
for ix, x in enumerate(np.arange(minx, maxx, tile_spacingX)):
    for iy, y in enumerate(np.arange(miny, maxy, tile_spacingY)):
        y_offset = tile_spacingY / 2 if ix % 2 == 1 else 0
        centers.append((x, y + y_offset))

# === 6. 六角形生成関数 ===
def hexagon_coords(cx, cy, a):
    angles = [0, 60, 120, 180, 240, 300]
    pts = [(cx + a * math.cos(math.radians(t)), cy + a * math.sin(math.radians(t))) for t in angles]
    pts.append(pts[0])
    return pts

# === 7. 各六角形がどの都道府県・市区町村に属するか判定 ===
hexes = []
radius = a * 0.8

for cx, cy in centers:
    p = Point(cx, cy)
    circle = p.buffer(radius)
    place = {"area": [], "hex": None}

    for idx, geom in enumerate(gdf_polygons.geometry):
        overlap_area = geom.intersection(circle).area
        if overlap_area>0:
            place["area"].append({
                "best_pref01": gdf_polygons.iloc[idx]["N03_001"],
                "best_pref03": gdf_polygons.iloc[idx]["N03_003"],
                "best_overlap_area": overlap_area
            })

    # 六角形のポリゴンを作成
    coords = hexagon_coords(cx, cy, a)
    place["hex"] = Polygon(coords)
    if len(place["area"])>0:
        hexes.append(place)
hexes_before = [h.copy() for h in hexes]
# === 8. pref01 内で overlap 最大の area のみ残す ===
filtered_hexes_pref01 = []
for h in hexes:
    # pref01ごとに合計 overlap を計算
    places = {}
    for area in h["area"]:
        places[area["best_pref01"]] = places.get(area["best_pref01"], 0) + area["best_overlap_area"]

    # 最大 overlap の pref01 を選択
    max_place = max(places.items(), key=lambda x: x[1])[0]
    h["area"] = [area for area in h["area"] if area["best_pref01"] == max_place]
    filtered_hexes_pref01.append(h)

hexes = filtered_hexes_pref01

# === 9. pref03 内で overlap 最大の hex のみ残す ===
# pref03 内で overlap 最大の hex のみ残す
hexes_copy = hexes.copy()
for i, h1 in enumerate(hexes_copy):
    to_remove_h1 = []
    for area1 in h1["area"]:
        for j, h2 in enumerate(hexes_copy):
            if i == j:
                continue
            to_remove_h2 = []
            for area2 in h2["area"]:
                if area1["best_pref03"] == area2["best_pref03"]:
                    
                    if area1["best_overlap_area"] >= area2["best_overlap_area"]:
                        if len(h2["area"])-len(to_remove_h2)>1:
                            to_remove_h2.append(area2)
                        else:
                            if len(h1["area"])-len(to_remove_h1)>1:
                                to_remove_h1.append(area1)
                    else:
                        if len(h1["area"])-len(to_remove_h1)>1:
                            to_remove_h1.append(area2)
                        else:
                            if len(h2["area"])-len(to_remove_h2)>1:
                                to_remove_h2.append(area1)
            
            # h2 から削除
            lens2=len(h2["area"])
            for a in to_remove_h2:
                if a in h2["area"]:
                    h2["area"].remove(a)
            if len(h2["area"])==0:
                print("おかしい2",lens2,len(to_remove_h2))
                
    # h1 から削除
    lens1=len(h1["area"])
    for a in to_remove_h1:
        if a in h1["area"]:
            h1["area"].remove(a)
    if len(h1["area"])==0:
        print("おかしい1",lens1,len(to_remove_h1))

# 最終 hexes に area が残っているものだけ残す
hexes = [h for h in hexes_copy]

# === 10. GeoDataFrame に変換 ===
hex_geoms = []
hex_pref01 = []
hex_pref03 = []

for h in hexes:
    hex_geoms.append(h["hex"])
    # area は1つだけ残っているはず
    area = h["area"]
    city=[]
    for a in area:
        city.append(a["best_pref03"])
    hex_pref01.append(h["area"][0]["best_pref01"])
    hex_pref03.append("_".join(city))


hex_gdf = gpd.GeoDataFrame(
    {"N03_001": hex_pref01, "N03_003": hex_pref03},
    geometry=hex_geoms,
    crs="EPSG:3857"
)


# === 11. 市区町村・都道府県ごとに結合 ===
fixed1 = hex_gdf.copy()
fixed2 = hex_gdf.copy()
fixed1["geometry"] = fixed1.buffer(0.5)
fixed2["geometry"] = fixed2.buffer(0.5)

todouhuken_gdf = fixed1.groupby("N03_001")["geometry"].apply(unary_union)
todouhuken_gdf = gpd.GeoDataFrame(todouhuken_gdf, geometry="geometry").reset_index()

sikutyoson_gdf = fixed2.groupby("N03_003")["geometry"].apply(unary_union)
sikutyoson_gdf = gpd.GeoDataFrame(sikutyoson_gdf, geometry="geometry").reset_index()
pref_map = hex_gdf.groupby("N03_003")["N03_001"].first().to_dict()
sikutyoson_gdf["N03_001"] = sikutyoson_gdf["N03_003"].map(pref_map)

# === 12. GeoJSON 出力 ===
os.makedirs("./public", exist_ok=True)
sikutyoson_gdf.to_file("./public/pref_hex_merged_sikutyoson.geojson", driver="GeoJSON", encoding="utf-8")
todouhuken_gdf.to_file("./public/pref_hex_merged_todouhuken.geojson", driver="GeoJSON", encoding="utf-8")

# === 13. 描画 ===
fig, ax = plt.subplots(figsize=(10, 10))
todouhuken_gdf.plot(column="N03_001", ax=ax, edgecolor="black", linewidth=0.8, alpha=0.7)
sikutyoson_gdf.plot(column="N03_003", ax=ax, edgecolor="black", linewidth=0.8, alpha=0.7)
plt.title("都道府県ごとに結合された六角形タイル図", fontsize=14)
plt.axis("off")
plt.show()
