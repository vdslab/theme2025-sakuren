import * as d3 from "d3";
import * as d3geo from "d3-geo";
import { useEffect, useState } from "react";
import type { GeoProperty } from "../types/geoProperty";
import type { WordBoundsData } from "../types/wordBoundsData";
import MunicipalityMap_detail from "./MunicipalityMap_detail";

interface MunicipalityMapProps {
  selectedWord: string | null;
  bounds: WordBoundsData;
  group: string;
  gIdx: number;
  hoverdPref: string | null;
  onHover: (word: string | null) => void;
  onWordClick: (word: string) => void;
}

const MunicipalityMap = ({
  selectedWord,
  bounds,
  group,
  gIdx,
  hoverdPref,
  onHover,
  onWordClick,
}: MunicipalityMapProps) => {
  const [geoFeatureParts, setGeoFeatureParts] = useState<
    GeoJSON.Feature<GeoJSON.Geometry, GeoProperty>[]
  >([]);
  const [filteredFeatures, setFilteredFeatures] = useState<
    GeoJSON.Feature<GeoJSON.Geometry, GeoProperty>[]
  >([]);

  // GeoJSON読み込み
  useEffect(() => {
    fetch("/municipalities_full.geojson")
      .then((res) => res.json())
      .then((data) => setGeoFeatureParts(data.features));
  }, []);

  // 都道府県に対応する地物だけ抽出
  useEffect(() => {
    if (!group || geoFeatureParts.length === 0) {
      setFilteredFeatures([]);
      return;
    }
    const filtered = geoFeatureParts.filter(
      (f) => f.properties?.N03_001 === group
    );
    setFilteredFeatures(filtered);
  }, [group, geoFeatureParts]);

  const groupBounds = group ? bounds[group] : null;

  const projection = groupBounds
    ? d3geo
        .geoIdentity()
        .reflectY(true)
        .fitExtent(
          [
            [groupBounds.xlim[0], groupBounds.ylim[0]],
            [groupBounds.xlim[1], groupBounds.ylim[1]],
          ],
          {
            type: "FeatureCollection",
            features: filteredFeatures,
          }
        )
    : null;

  const pathGenerator: d3.GeoPath<void, d3.GeoPermissibleObjects> | null =
    projection ? d3.geoPath().projection(projection) : null;

  if (!group || !groupBounds || !pathGenerator || filteredFeatures.length === 0)
    return null;

  return (
    <g key={gIdx} className="municipality-map">
      {filteredFeatures.map((feature, idx) => (
        <MunicipalityMap_detail
          idx={idx}
          key={idx}
          feature={feature}
          pathGenerator={pathGenerator}
          hoverdPref={hoverdPref}
          onHover={onHover}
          selectedWord={selectedWord}
          onWordClick={onWordClick}
        />
      ))}
    </g>
  );
};

export default MunicipalityMap;
