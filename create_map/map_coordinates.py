import geopandas as gpd
import matplotlib.pyplot as plt
import os
import json

# --- 日本全体のGeoJSONデータを読み込む ---
geojson_url = "https://github.com/dataofjapan/land/raw/master/japan.geojson"
gdf = gpd.read_file(geojson_url)

# --- 出力ディレクトリ作成 ---
output_dir = "./prefecture_layer/"
os.makedirs(output_dir, exist_ok=True)

# --- 日本全体のバウンディングボックス取得 ---
minx, miny, maxx, maxy = gdf.total_bounds

# --- 余白追加（全体サイズの5%）---
x_margin = (maxx - minx) * 0.05
y_margin = (maxy - miny) * 0.05
minx -= x_margin
maxx += x_margin
miny -= y_margin
maxy += y_margin

# --- 縦横比調整（日本は縦長）---
width = maxx - minx
height = maxy - miny
target_aspect = 1.3
desired_height = width * target_aspect
height_diff = desired_height - height
if height_diff > 0:
    miny -= height_diff / 2
    maxy += height_diff / 2

# --- ズーム倍率（小さいほどズームイン）---
zoom_factor = 1  # 1ならそのまま

# --- ズーム後の共通表示範囲 ---
center_x = (minx + maxx) / 2
center_y = (miny + maxy) / 2
zoom_width = (maxx - minx) * zoom_factor
zoom_height = (maxy - miny) * zoom_factor
minx_zoom = center_x - zoom_width / 2
maxx_zoom = center_x + zoom_width / 2
miny_zoom = center_y - zoom_height / 2
maxy_zoom = center_y + zoom_height / 2

# --- 共通の描画サイズとDPI ---
figsize = (10, 10)  # inch, 実務的に縮小
dpi = 300

# --- ピクセルサイズ ---
width_px = int(figsize[0] * dpi)
height_px = int(figsize[1] * dpi)

# --- 都道府県ごとのピクセル座標バウンディングボックス記録用辞書 ---
pixel_bounds_dict = {}

# --- 各都道府県を描画 ---
for _, row in gdf.iterrows():
    pref_name = row['nam_ja']
    print(f"Rendering {pref_name}...")

    fig, ax = plt.subplots(figsize=figsize)
    ax.axis('off')

    # 該当都道府県のみ描画
    gdf_single = gpd.GeoDataFrame([row], crs=gdf.crs)
    gdf_single.plot(ax=ax, color='black', edgecolor='none')

    # 共通のズーム範囲をセットして中央ドアップ的に表示
    ax.set_xlim(minx_zoom, maxx_zoom)
    ax.set_ylim(miny_zoom, maxy_zoom)
    ax.set_aspect('equal')

    # 画像保存
    filename = os.path.join(output_dir, f"{pref_name}.png")
    plt.savefig(filename, format='png', dpi=dpi, bbox_inches='tight', pad_inches=0, transparent=False)
    plt.close(fig)

    # 都道府県の経度緯度バウンディングボックス
    minx_pref, miny_pref, maxx_pref, maxy_pref = row.geometry.bounds

    # 経度→ピクセルX変換
    px_min = (minx_pref - minx_zoom) / (maxx_zoom - minx_zoom) * width_px
    px_max = (maxx_pref - minx_zoom) / (maxx_zoom - minx_zoom) * width_px

    # 緯度→ピクセルY変換（上下反転に注意）
    py_min = (maxy_zoom - maxy_pref) / (maxy_zoom - miny_zoom) * height_px
    py_max = (maxy_zoom - miny_pref) / (maxy_zoom - miny_zoom) * height_px

    # ピクセル座標として辞書に保存
    pixel_bounds_dict[pref_name] = {
        "xlim": [px_min, px_max],
        "ylim": [py_min, py_max]
    }

# --- 共通ズーム範囲をJSONに保存 ---
common_bounds = {
    "minx_zoom": minx_zoom,
    "maxx_zoom": maxx_zoom,
    "miny_zoom": miny_zoom,
    "maxy_zoom": maxy_zoom,
    "width_px": width_px,
    "height_px": height_px,
}
with open("map_common_bounds.json", "w", encoding="utf-8") as f:
    json.dump(common_bounds, f, ensure_ascii=False, indent=2)

# --- 都道府県のピクセル範囲JSON保存 ---
with open("prefecture_pixel_map_bounds.json", "w", encoding="utf-8") as f:
    json.dump(pixel_bounds_dict, f, ensure_ascii=False, indent=2)

print("✅ 全ての都道府県画像とピクセル座標データを保存しました。")
