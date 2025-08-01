import geopandas as gpd

# 入出力ファイルパス
base_path = "create_map/map/"
input_path = base_path + "N03-23_230101.geojson"
output_path = base_path + "output.geojson"

# GeoJSON読み込み
gdf = gpd.read_file(input_path)

# 投影座標系に変換（面積計算のため）
gdf = gdf.to_crs(epsg=6677)

# 面積計算
gdf["area"] = gdf.geometry.area

# (N03_001, N03_004) のペアごとに最大面積の行を取得
idx = gdf.groupby(["N03_001", "N03_002", "N03_003", "N03_004"])["area"].idxmax()
gdf_max_area = gdf.loc[idx]

# WGS84に戻す（GeoJSON出力のため）
gdf_max_area = gdf_max_area.to_crs(epsg=4326)

# N03_007（町名）で昇順ソート（存在しない場合は必要に応じて除外）
gdf_max_area = gdf_max_area.sort_values(by="N03_007")

# 出力
gdf_max_area.to_file(output_path, driver="GeoJSON")

print(
    f"{output_path} に (N03_001, N03_004) ごとの最大面積ポリゴンを N03_007順で保存しました。"
)
