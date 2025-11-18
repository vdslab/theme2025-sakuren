import geopandas as gpd
import matplotlib.pyplot as plt

# GeoJSON 読み込み
geojson_path = "./create_map/create_cartgram/N03_merged_city.geojson"
gdf = gpd.read_file(geojson_path)

# 描画
fig, ax = plt.subplots(1, 1, figsize=(8, 8))
gdf.plot(ax=ax, color="lightblue", edgecolor="black")
ax.set_title("Akita Cartogram")
plt.show()
