import json
import os
import subprocess
import tempfile
from collections import defaultdict


def merge_polygons_by_prefecture():
    """
    N03_001（都道府県名）ごとにポリゴンを結合するプログラム
    mapshaperを使用して結合処理を行う
    municipalities_tuning.geojsonファイルを対象に処理を行う
    """
    # 入力ファイルと出力ファイルのパス
    input_file = "create_map/merge/municipalities.json"
    output_dir = "create_map/merge/output2"

    # 出力ディレクトリが存在しない場合は作成
    os.makedirs(output_dir, exist_ok=True)

    # GeoJSONファイルを読み込む
    print(f"GeoJSONファイル '{input_file}' を読み込んでいます...")
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 都道府県ごとにフィーチャーを分類
    prefecture_features = defaultdict(list)

    print("都道府県ごとにフィーチャーを分類しています...")
    for feature in data["features"]:
        prefecture = feature["properties"].get("N03_001")
        if prefecture:
            prefecture_features[prefecture].append(feature)

    print(f"合計 {len(prefecture_features)} 都道府県が見つかりました")

    # 都道府県ごとにポリゴンを結合
    for prefecture, features in prefecture_features.items():
        print(f"{prefecture} のポリゴンを結合しています...")

        # 都道府県ごとのGeoJSONを作成
        prefecture_geojson = {"type": "FeatureCollection", "features": features}

        # 一時ファイルに保存
        with tempfile.NamedTemporaryFile(
            suffix=".geojson", delete=False, mode="w", encoding="utf-8"
        ) as temp_input:
            json.dump(prefecture_geojson, temp_input, ensure_ascii=False)
            temp_input_path = temp_input.name

        # 出力ファイルパス
        output_file = os.path.join(output_dir, f"{prefecture}_merged.geojson")

        # mapshaperを使用してポリゴンを結合
        try:
            # mapshaper コマンドを実行
            # dissolveオプションを使用してポリゴンを結合
            cmd = [
                "mapshaper",
                temp_input_path,
                # "-snap interval=0.001",
                "-clean snap-interval=0.001 overlap-rule=max-id",
                "-dissolve",
                # 結合の基準となるフィールド
                "N03_001",
                # 結合時のオプション（重複を削除し、単一のポリゴンに）
                "copy-fields=N03_001",
                "-o",
                output_file,
                "format=geojson",
            ]

            print(f"実行コマンド: {' '.join(cmd)}")
            subprocess.run(cmd, check=True)
            print(f"{prefecture} のポリゴン結合が完了しました: {output_file}")

        except subprocess.CalledProcessError as e:
            print(f"エラー: {prefecture} のポリゴン結合に失敗しました: {e}")

        finally:
            # 一時ファイルを削除
            os.unlink(temp_input_path)

    # すべての都道府県の結合結果を一つのGeoJSONファイルにまとめる
    merged_features = []

    print("すべての結合結果を一つのファイルにまとめています...")
    for prefecture in prefecture_features.keys():
        prefecture_file = os.path.join(output_dir, f"{prefecture}_merged.geojson")

        try:
            with open(prefecture_file, "r", encoding="utf-8") as f:
                prefecture_data = json.load(f)
                merged_features.extend(prefecture_data["features"])
        except FileNotFoundError:
            print(f"警告: {prefecture} の結合ファイルが見つかりませんでした")

    # 最終的な結合結果を保存
    final_output = {"type": "FeatureCollection", "features": merged_features}

    final_output_path = "create_map/merge/municipalities_tuning_merged.geojson"
    with open(final_output_path, "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False)

    print(f"すべての処理が完了しました。最終結果: {final_output_path}")


if __name__ == "__main__":
    merge_polygons_by_prefecture()
