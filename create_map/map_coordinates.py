import geopandas as gpd
import matplotlib.pyplot as plt
import os
import json
from PIL import Image
import numpy as np

# --- GeoJSON読み込み ---
gdf = gpd.read_file("./public/municipalities_full.geojson")

# --- 出力ディレクトリ作成 ---
output_image_dir = "./prefecture_layer/"
output_json_dir = "./pixel_map/"
os.makedirs(output_image_dir, exist_ok=True)
os.makedirs(output_json_dir, exist_ok=True)

# --- 画像サイズ基準 ---
MAX_PX = 400  # 出力画像の最大辺のピクセル数

# --- 市区町村単位で処理 ---
for _, row in gdf.iterrows():
    pref = row["N03_001"]  # 都道府県名
    city = row["N03_003"]
    if city[-1] != "市" and city[-1] != "郡":
        city = row["N03_004"]

    pref_image_dir = os.path.join(output_image_dir, pref)
    os.makedirs(pref_image_dir, exist_ok=True)
    pref_json_dir = os.path.join(output_json_dir, pref)
    os.makedirs(pref_json_dir, exist_ok=True)
    name=city

    # 単一ジオメトリとしてGeoDataFrame作成
    gdf_single = gpd.GeoDataFrame([row], crs=gdf.crs)

    # --- 描画範囲（市区町村単位のboundsでズーム最大化） ---
    minx, miny, maxx, maxy = row.geometry.bounds
    width = maxx - minx
    height = maxy - miny

    if width > height:
        figsize = (10, 10 * (height / width))
    else:
        figsize = (10 * (width / height), 10)

    dpi = MAX_PX / max(figsize)

    # --- 描画 ---
    fig, ax = plt.subplots(figsize=figsize)
    ax.axis("off")
    gdf_single.plot(ax=ax, color='black', edgecolor='none')

    ax.set_xlim(minx, maxx)
    ax.set_ylim(miny, maxy)
    ax.set_aspect('equal')

    image_path = os.path.join(pref_image_dir, f"{name}.png")
    fig.savefig(image_path, dpi=dpi, bbox_inches="tight", pad_inches=0)
    plt.close(fig)

    # # --- マスク画像読み込み ---
    # image = Image.open(image_path).convert("L")
    # image_array = np.array(image)

    # # --- 黒ピクセル抽出（マスク領域） ---
    # black_pixels = np.argwhere(image_array < 128)
    # if black_pixels.size == 0:
    #     print(f"⚠ {name} に黒領域なし: スキップ")
    #     continue

    # h, w = image_array.shape
    # pixel_map = {}

    # for y, x in black_pixels:
    #     norm_x = round(x / w, 4)
    #     norm_y = round(y / h, 4)
    #     pixel_map[f"{x}_{y}"] = {"norm_x": norm_x, "norm_y": norm_y}

    # --- JSON出力 ---
    # json_path = os.path.join(pref_json_dir, f"{name}.json")
    # with open(json_path, "w", encoding="utf-8") as f:
    #     json.dump(pixel_map, f, ensure_ascii=False, indent=2)

    print(f"✅ {name} 完了")
