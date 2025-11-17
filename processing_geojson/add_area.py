"""
GeoJSON の各フィーチャーに面積を追加し、特定の条件でフィーチャーを統合・削除するスクリプト
"""

import json

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

# GeoJSON 読み込み
with open("processing_geojson/data/N03-20240101.geojson", "r", encoding="utf-8") as f:
    geojson_data = json.load(f)

remove_props = ["N03_002", "N03_007"]

prop_set = set()
prop_set2 = set()

# 各フィーチャーに面積を追加
for feature in geojson_data["features"]:
    geom = shape(feature["geometry"])  # shapely のジオメトリに変換

    # 面積計算とプロパティ追加
    area = geom.area  # 面積を計算（単位は GeoJSON 座標系に依存）
    feature["properties"]["area"] = area  # プロパティに追加

    # 不要なプロパティを削除
    for prop in remove_props:
        if prop in feature["properties"]:
            del feature["properties"][prop]

    # N03_003 が None の場合、N03_004 の値を代入
    if feature["properties"]["N03_003"] == None:
        feature["properties"]["N03_003"] = feature["properties"]["N03_004"]

    prop_set.add(
        (
            feature["properties"]["N03_001"],
            feature["properties"]["N03_003"],
            feature["properties"]["N03_004"],
            feature["properties"]["N03_005"],
        )
    )
    prop_set2.add(
        (
            feature["properties"]["N03_001"],
            feature["properties"]["N03_003"],
        )
    )

    print(feature["properties"]["N03_003"])

# 同じ N03_001, N03_003, N03_004, N03_005 の組み合わせで最大面積のポリゴンのみ残す
for prop in prop_set:
    N03_001, N03_003, N03_004, N03_005 = prop
    matching_features = [
        feature
        for feature in geojson_data["features"]
        if (
            feature["properties"]["N03_001"],
            feature["properties"]["N03_003"],
            feature["properties"]["N03_004"],
            feature["properties"]["N03_005"],
        )
        == prop
    ]
    if matching_features:
        max_area = max(f["properties"]["area"] for f in matching_features)
        geojson_data["features"] = [
            feature
            for feature in geojson_data["features"]
            if (
                feature["properties"]["N03_001"],
                feature["properties"]["N03_003"],
                feature["properties"]["N03_004"],
                feature["properties"]["N03_005"],
            )
            != prop
            or feature["properties"]["area"] >= max_area
        ]

    print(
        f"Processed N03_001: {N03_001}, N03_003: {N03_003}, N03_004: {N03_004}, N03_005: {N03_005}"
    )

# 同じ N03_001, N03_003 の組み合わせでポリゴンをマージし、面積を再計算
merged_features = []

for combo in prop_set2:
    group = [
        feature
        for feature in geojson_data["features"]
        if (feature["properties"]["N03_001"], feature["properties"]["N03_003"]) == combo
    ]
    if not group:
        continue
    merged_geom = unary_union([shape(f["geometry"]) for f in group])
    props = dict(group[0]["properties"])
    props["area"] = merged_geom.area
    merged_features.append(
        {
            "type": "Feature",
            "properties": props,
            "geometry": mapping(merged_geom),
        }
    )

    print(f"Merged features for N03_001: {combo[0]}, N03_003: {combo[1]}")

geojson_data["features"] = merged_features


# MultiPolygonのもので最大面積のポリゴンのみ残し、不要なプロパティの削除
for feature in geojson_data["features"]:
    geom = shape(feature["geometry"])
    if geom.geom_type == "MultiPolygon":
        largest_polygon = max(geom.geoms, key=lambda poly: poly.area)
        feature["geometry"] = mapping(largest_polygon)
        feature["properties"]["area"] = largest_polygon.area

    remove_props2 = ["N03_004", "N03_005", "area"]
    # 不要なプロパティを削除
    for prop in remove_props2:
        if prop in feature["properties"]:
            del feature["properties"][prop]

    print(
        f"Processed N03_001: {feature['properties']['N03_001']}, N03_003: {feature['properties']['N03_003']}"
    )


# GeoJSON 書き込み
with open(
    "processing_geojson/data/N03-20240101_processed.geojson", "w", encoding="utf-8"
) as f:
    json.dump(geojson_data, f, ensure_ascii=False, indent=2)

print("処理が完了しました")
