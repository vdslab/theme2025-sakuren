import geopandas as gpd
import matplotlib.pyplot as plt
import os
import json
from PIL import Image
import numpy as np

# --- GeoJSON読み込み ---
gdf = gpd.read_file("./public/municipalities_full.geojson")

# --- 出力ディレクトリ ---
output_image_base = "./prefecture_layer/"
output_json_base = "./pixel_map/"
os.makedirs(output_image_base, exist_ok=True)
os.makedirs(output_json_base, exist_ok=True)

# --- 全体ズーム調整用の係数 ---
MAX_PX = 512  # 画像の最大辺(px)

# --- 出力辞書 ---
pixel_bounds_dict = {}

# --- 都道府県ごとにループ ---
for pref_name, pref_gdf in gdf.groupby("N03_001"):
    print(f"▶ {pref_name}")

    # 出力先フォルダ作成
    pref_image_dir = os.path.join(output_image_base, pref_name)
    pref_json_dir = os.path.join(output_json_base, pref_name)
    os.makedirs(pref_image_dir, exist_ok=True)
    os.makedirs(pref_json_dir, exist_ok=True)

    # 描画範囲取得
    minx, miny, maxx, maxy = pref_gdf.total_bounds
    width = maxx - minx
    height = maxy - miny

    # 縦横比と解像度調整
    if width > height:
        figsize = (10, 10 * (height / width))
    else:
        figsize = (10 * (width / height), 10)

    dpi = MAX_PX / max(figsize)

    # 辞書初期化
    pixel_bounds_dict[pref_name] = {}

    # --- 都道府県全体画像（ズームなし）描画 ---
    fig, ax = plt.subplots(figsize=figsize)
    ax.axis("off")
    pref_gdf.plot(ax=ax, color='black', edgecolor='none')
    ax.set_xlim(minx, maxx)
    ax.set_ylim(miny, maxy)
    ax.set_aspect('equal')

    pref_all_path = os.path.join(pref_image_dir, "_all.png")
    plt.savefig(pref_all_path, dpi=dpi, bbox_inches='tight', pad_inches=0, transparent=False)
    plt.close(fig)

    # --- 全体画像のマスク情報を取得 ---
    try:
        mask_image = Image.open(pref_all_path).convert("L")
        mask_array = np.array(mask_image)
        mask_indices = np.where(mask_array < 128)

        if mask_indices[0].size > 0 and mask_indices[1].size > 0:
            pixel_bounds_dict[pref_name]["_all"] = {
                "xlim": [int(np.min(mask_indices[1])), int(np.max(mask_indices[1]))],
                "ylim": [int(np.min(mask_indices[0])), int(np.max(mask_indices[0]))],
            }
        else:
            print(f"⚠️ {pref_name} 全体画像に有効なピクセルがありません")

    except Exception as e:
        print(f"⚠️ {pref_name} 全体画像読み込み失敗: {e}")

    # --- 市区町村ごとにループ ---
    for _, row in pref_gdf.iterrows():
        city_name = row["N03_003"]
        if city_name[-1] != "市" and city_name[-1] != "群":
            city_name = row["N03_004"]
        if not city_name:
            continue

        print(f"  - {city_name}")

        # 市区町村単位のGeoDataFrame
        gdf_single = gpd.GeoDataFrame([row], crs=gdf.crs)

        # 描画
        fig, ax = plt.subplots(figsize=figsize)
        ax.axis("off")
        gdf_single.plot(ax=ax, color='black', edgecolor='none')
        ax.set_xlim(minx, maxx)
        ax.set_ylim(miny, maxy)
        ax.set_aspect('equal')

        filename = os.path.join(pref_image_dir, f"{city_name}.png")
        plt.savefig(filename, dpi=dpi, bbox_inches='tight', pad_inches=0, transparent=False)
        plt.close(fig)

        # マスク画像からピクセル座標取得
        try:
            mask_image = Image.open(filename).convert("L")
            mask_array = np.array(mask_image)
            mask_indices = np.where(mask_array < 128)

            if mask_indices[0].size == 0 or mask_indices[1].size == 0:
                print(f"⚠️ {city_name} は空の画像です（スキップ）")
                continue

            pixel_bounds_dict[pref_name][city_name] = {
                "xlim": [int(np.min(mask_indices[1])), int(np.max(mask_indices[1]))],
                "ylim": [int(np.min(mask_indices[0])), int(np.max(mask_indices[0]))]
            }

        except Exception as e:
            print(f"⚠️ マスク画像処理失敗: {city_name}: {e}")
            continue

    # --- 都道府県単位でJSON保存 ---
    with open(os.path.join(pref_json_dir, "municipality_pixel_map_bounds.json"), "w", encoding="utf-8") as f:
        json.dump({pref_name: pixel_bounds_dict[pref_name]}, f, ensure_ascii=False, indent=2)

# --- 完了メッセージ ---
print("✅ 完了: 各市区町村と都道府県全体画像、およびピクセル座標データを保存しました。")
