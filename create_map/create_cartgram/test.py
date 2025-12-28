import geopandas as gpd
import matplotlib.pyplot as plt

files = [
    "./create_map/create_cartgram/N03_merged_city_no_islands.geojson",
]

fig, axes = plt.subplots(1, len(files), figsize=(5 * len(files), 8))
axes = [axes] if len(files) == 1 else axes

for i, path in enumerate(files):
    gdf = gpd.read_file(path)
    print(gdf.columns)
    gdf_hokkaido = gdf[gdf["N03_003"] == "北海道"]

    gdf_hokkaido.plot(ax=axes[i], color="lightblue", edgecolor="black")
    axes[i].axis("off")

plt.tight_layout()
plt.show()
