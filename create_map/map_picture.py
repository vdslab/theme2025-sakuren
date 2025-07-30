import geopandas as gpd
import matplotlib.pyplot as plt
import os
import json
from PIL import Image
import numpy as np

# GeoJSON読み込み
gdf = gpd.read_file("./public/municipalities_full.geojson")

# 出力ベースディレクトリ
base_output_dir = "./prefecture_layer/"
os.makedirs(base_output_dir, exist_ok=True)

# 画像サイズとDPI
figsize = (10, 10)
dpi = 300

# 日本全体の共通バウンディングボックスを取得
minx, miny, maxx, maxy = gdf.total_bounds
print(f"日本全体bounds: minx={minx}, maxx={maxx}, miny={miny}, maxy={maxy}")

# 縦横比補正（必要なら）
width = maxx - minx
height = maxy - miny
target_aspect = 1.3
desired_height = width * target_aspect
height_diff = desired_height - height
if height_diff > 0:
    miny -= height_diff / 2
    maxy += height_diff / 2
print(f"補正後bounds: minx={minx}, maxx={maxx}, miny={miny}, maxy={maxy}")

# 都道府県ごとに処理
pixel_bounds_dict = {}

for pref_name, gdf_group in gdf.groupby("N03_001"):
    print(f"Processing {pref_name} ...")

    # 保存先フォルダ作成
    pref_dir = os.path.join(base_output_dir, pref_name)
    os.makedirs(pref_dir, exist_ok=True)

    # プロット作成
    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    ax.axis('off')

    # 都道府県全体を黒塗り
    gdf_group.plot(ax=ax, color='black', edgecolor='none')

    # 共通座標範囲設定（ズームなし）
    ax.set_xlim(minx, maxx)
    ax.set_ylim(miny, maxy)
    ax.set_aspect('equal')

    # レイアウト調整は一旦コメントアウト（bbox_inches='tight'と競合しやすいため）
    # plt.tight_layout()

    # 画像保存
    filename = os.path.join(pref_dir, f"{pref_name}.png")
    plt.savefig(filename, format='png', dpi=dpi, bbox_inches=None, pad_inches=0, transparent=False)
    plt.close(fig)
    print(f"  Saved image: {filename}")

    # 画像をグレースケール読み込み
    mask_image = Image.open(filename).convert("L")
    mask_array = np.array(mask_image)

    # 黒領域のピクセル位置検出
    mask_indices = np.where(mask_array < 128)
    if mask_indices[0].size == 0 or mask_indices[1].size == 0:
        print(f"⚠️ {pref_name} は空画像のためスキップ")
        continue

    # ピクセル範囲取得
    min_y, max_y = int(np.min(mask_indices[0])), int(np.max(mask_indices[0]))
    min_x, max_x = int(np.min(mask_indices[1])), int(np.max(mask_indices[1]))
    print(f"  Pixel bounds: x={min_x}-{max_x}, y={min_y}-{max_y}")

    # 辞書に追加
    pixel_bounds_dict[pref_name] = {
        "xlim": [min_x, max_x],
        "ylim": [min_y, max_y]
    }

# JSONファイル保存
json_path = os.path.join("prefecture_pixel_map_bounds.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(pixel_bounds_dict, f, ensure_ascii=False, indent=2)

print(f"✅ 全て完了しました。 JSONを保存しました: {json_path}")
