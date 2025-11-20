import geopandas as gpd
import matplotlib.pyplot as plt

# 比較したい GeoJSON ファイルをリストで指定
search_words = [
     "千葉県", "愛媛県", 
    
]
files = []
for word in search_words:
    files.append(f"./{word}_cartogram.geojson")

# サブプロットを作成（横並び）
fig, axes = plt.subplots(1, len(files), figsize=(5 * len(files), 8))

for i, path in enumerate(files):
    gdf = gpd.read_file(path)
    gdf = gdf.to_crs(epsg=3857)
    gdf.plot(ax=axes[i], color="lightblue", edgecolor="black")
    axes[i].axis("off")  # 軸ラベルは非表示

plt.tight_layout()
plt.show()
