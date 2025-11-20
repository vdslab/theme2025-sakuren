import geopandas as gpd
import matplotlib.pyplot as plt

files = ["./create_map"]

fig, axes = plt.subplots(1, len(files), figsize=(5 * len(files), 8))
axes = [axes] if len(files) == 1 else axes

for i, path in enumerate(files):
    gdf = gpd.read_file(path)
    gdf.plot(ax=axes[i], color="lightblue", edgecolor="black")
    axes[i].axis("off")

plt.tight_layout()
plt.show()
