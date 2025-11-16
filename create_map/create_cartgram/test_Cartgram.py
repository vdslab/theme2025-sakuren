import json
import geopandas as gpd
import matplotlib.pyplot as plt
from cartogram import Cartogram

# =========================
# 1. GeoJSON 読み込み
# =========================
geojson_path = "./tilegram_app/public/data/N03-21_210101.json"  # 実際のファイルパスに置き換える
with open(geojson_path, "r", encoding="utf-8") as f:
    geojson_data = json.load(f)

gdf = gpd.GeoDataFrame.from_features(geojson_data["features"], crs="EPSG:4326")

# =========================
# 2. 人口データ読み込み
# =========================
population_path="./create_map/create_cartgram/population_detail.json"
with open(population_path,"r",encoding="utf-8") as f:
    population_data=json.load(f)

# GeoDataFrame に人口列を追加
gdf["population"] = gdf["N03_007"].map(population_data)
print(gdf)
# 欠損値があれば確認
missing = gdf[gdf["population"].isna()]
if not missing.empty:
    print("人口データがない地域:", missing["N03_007"].tolist())
    # 欠損値を 0 に置換
    gdf["population"] = gdf["population"].fillna(0)

# =========================
# 3. カルトグラム作成
# =========================
c = Cartogram(gdf, cartogram_attribute="population", max_iterations=20)
c.compute_cartogram()

# =========================
# 4. 描画
# =========================
fig, ax = plt.subplots(1, 2, figsize=(15, 8))

# 元の地図
gdf.plot(ax=ax[0], color="lightgray", edgecolor="black")
ax[0].set_title("Original Map")

# カルトグラム
c.plot(ax=ax[1], color="lightblue", edgecolor="black")
ax[1].set_title("Cartogram (Population)")

plt.tight_layout()
plt.show()
