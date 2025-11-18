import json
import geopandas as gpd
import matplotlib.pyplot as plt
from shapely.geometry import Polygon, MultiPolygon
from cartogram import Cartogram


# =========================
# MultiPolygon → 最大 Polygon に変換（離島を全部消す）
# =========================
def drop_islands_keep_largest(geom):
    """
    MultiPolygon のうち最大面積の Polygon のみ残す（離島は消す）
    """
    if isinstance(geom, Polygon):
        return geom

    if isinstance(geom, MultiPolygon):
        # 最大面積の Polygon を選ぶ → 他は自動で消える
        largest = max(geom.geoms, key=lambda p: p.area)
        return largest

    return None  # 変なジオメトリは削除


# =========================
# 1. GeoJSON 読み込み
# =========================
geojson_path = "./create_map/create_cartgram/N03_merged_city.geojson"
with open(geojson_path, "r", encoding="utf-8") as f:
    geojson_data = json.load(f)

gdf = gpd.GeoDataFrame.from_features(geojson_data["features"], crs="EPSG:4326")

# カルトグラム用に平面座標系へ
gdf = gdf.to_crs(epsg=3857)


# =========================
# 2. 人口データ読み込み
# =========================
population_path = "./create_map/create_cartgram/population_detail.json"
with open(population_path, "r", encoding="utf-8") as f:
    population_data = json.load(f)

gdf["population"] = gdf["N03_003"].map(population_data).fillna(0)


# =========================
# 3. カルトグラム作成
# =========================
c = Cartogram(gdf, cartogram_attribute="population", max_iterations=1, verbose=True)
carto_gdf = c


# =========================
# 4. GeoJSON 保存
# =========================
carto_gdf.to_crs(epsg=4326).to_file("./kyoto_cartogram.geojson", driver="GeoJSON", encoding="utf-8")


# =========================
# 5. 描画
# =========================
fig, ax = plt.subplots(1, 2, figsize=(15, 8))

gdf.plot(ax=ax[0], color="lightgray", edgecolor="black")
ax[0].set_title("Original Map (No Islands)")

carto_gdf.plot(ax=ax[1], color="lightblue", edgecolor="black")
ax[1].set_title("Cartogram (Population)")

plt.tight_layout()
plt.show()
