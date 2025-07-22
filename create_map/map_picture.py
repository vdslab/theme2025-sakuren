import geopandas as gpd
import matplotlib.pyplot as plt
import os

# GeoJSONを読み込み
gdf = gpd.read_file("C:/Users/lotus/theme2025-sakuren/public/prefecture_single.geojson")

# 出力ディレクトリ
output_dir = "./prefecture_layer_closeup/"
os.makedirs(output_dir, exist_ok=True)

# 出力画像サイズ（インチ）と解像度（dpi）
figsize = (10, 10)  # 正方形キャンバス
dpi = 300           # 解像度
zoom_margin = 0.05  # 少し余白をつける（5%）

# 各都道府県ごとに処理
for _, row in gdf.iterrows():
    pref_name = row["prefecture"]

    # 単一都道府県のGeoDataFrame
    gdf_single = gpd.GeoDataFrame([row], crs=gdf.crs)

    # バウンディングボックス取得
    minx, miny, maxx, maxy = gdf_single.total_bounds

    # 少し余白を追加（上下左右）
    x_margin = (maxx - minx) * zoom_margin
    y_margin = (maxy - miny) * zoom_margin
    minx -= x_margin
    maxx += x_margin
    miny -= y_margin
    maxy += y_margin

    # 描画
    fig, ax = plt.subplots(figsize=figsize)
    ax.axis('off')
    gdf_single.plot(ax=ax, color='black', edgecolor='none')

    ax.set_xlim(minx, maxx)
    ax.set_ylim(miny, maxy)
    ax.set_aspect('equal')
    plt.tight_layout()

    # 保存
    filename = os.path.join(output_dir, f"{pref_name}.png")
    plt.savefig(filename, format='png', dpi=dpi, bbox_inches='tight', pad_inches=0, transparent=False)
    plt.close(fig)

    print(f"Saved {filename}")
