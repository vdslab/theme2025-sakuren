import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon, Point
import numpy as np
import math
import os
import json

os.makedirs("./public", exist_ok=True)
output_path = "./public/pref_hex_merged_detail.geojson"

# 空のFeatureCollectionを用意
final_data = {"type": "FeatureCollection", "features": []}

for i in range(5, 52):
    # === 1. GeoJSONを読み込む ===
    gdf = gpd.read_file(f"./public/cartogram_lonlat ({i}).geojson")
    pref_col = "N03_003"  # 都道府県名の列名


    # === 2. 投影座標系に変換 ===
    gdf = gdf.to_crs("EPSG:3857")
    # === 3. MultiPolygonをPolygon単位に分解 ===
    polygons, names = [], []
    count=0
    for _, row in gdf.iterrows():
        geom = row.geometry
        if row[pref_col]==None or row[pref_col][-1]!="市" and row[pref_col][-1]!="郡":
            pref_col="N03_004"
        name = row[pref_col]
        if isinstance(geom, Polygon):
            polygons.append(geom)
            names.append(name)
        elif isinstance(geom, MultiPolygon):
            for poly in geom.geoms:
                polygons.append(poly)
                names.append(name)

    print(i)
    gdf_polygons = gpd.GeoDataFrame({"pref_name": names}, geometry=polygons, crs=gdf.crs)

    # === 4. 六角形タイル設定 ===
    tile_area = 5e5
    a = math.sqrt(2 * tile_area / (3 * math.sqrt(3)))
    tile_spacingX = 3 * a / 2
    tile_spacingY = math.sqrt(3) * a

    # === 5. 六角形中心点グリッド ===
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

    # === 7. 六角形所属判定 ===
    hexes, owners = [], []
    radius = a * 0.8
    for cx, cy in centers:
        p = Point(cx, cy)
        circle = p.buffer(0)
        best_pref = None
        best_overlap_area = 0
        for idx, geom in enumerate(gdf_polygons.geometry):
            overlap_area = geom.intersection(circle).area
            if overlap_area > best_overlap_area:
                best_overlap_area = overlap_area
                best_pref = gdf_polygons.iloc[idx]["pref_name"]
        if best_pref is not None:
            coords = hexagon_coords(cx, cy, a)
            hexes.append(Polygon(coords))
            owners.append(best_pref)

    hex_gdf = gpd.GeoDataFrame({"pref_name": owners}, geometry=hexes, crs="EPSG:3857")

    # === 8. 都道府県ごとに結合 ===
    merged_gdf = hex_gdf.dissolve(by="pref_name").reset_index()

    # === 9. FeatureCollectionに追加 ===
    for _, row in merged_gdf.iterrows():
        feature = {
            "type": "Feature",
            "properties": {"N03_001": row["N03_001"],"pref_name":row[pref_col]},
            "geometry": json.loads(row.geometry.to_json()),
            "id": row["pref_name"]
        }
        final_data["features"].append(feature)

# === 10. まとめてGeoJSON出力 ===
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(final_data, f, ensure_ascii=False, indent=2)

print(f"✅ 出力完了: {output_path}")
