import * as d3 from "d3";
import * as d3geo from "d3-geo";
import { useEffect, useState } from "react";
import type { WordLayoutData } from "../types/wordLayoutData";
import MunicipalityMap_detail from "./MunicipalityMap_detail";

interface MunicipalityMapProps {
  selectedWord: string | null;
  bounds: Record<string, any>;
  group: any;
  gIdx: number;
  hoverdPref: WordLayoutData | any | null;
  onHover: (word: WordLayoutData | null) => void;
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
  const [geoFeatureParts, setGeoFeatureParts] = useState<any[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<any[]>([]);

  // GeoJSON読み込み
  useEffect(() => {
    fetch("/municipalities_full.geojson")
      .then((res) => res.json())
      .then((data) => setGeoFeatureParts(data.features));
  }, []);

  // 都道府県に対応する地物だけ抽出
  useEffect(() => {
    if (!group?.name || geoFeatureParts.length === 0) {
      setFilteredFeatures([]);
      return;
    }
    const filtered = geoFeatureParts.filter(
      (f) => f.properties.N03_001 === group.name
    );
    setFilteredFeatures(filtered);
  }, [group, geoFeatureParts]);

  const groupBounds = group?.name ? bounds[group.name] : null;

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

  const pathGenerator = projection ? d3.geoPath().projection(projection) : null;

  if (
    !group?.name ||
    !groupBounds ||
    !pathGenerator ||
    filteredFeatures.length === 0
  )
    return null;

  return (
    <g key={gIdx} className="municipality-map">
      {filteredFeatures.map((feature, idx) => (
        <MunicipalityMap_detail
          idx={idx}
          feature={feature}
          pathGenerator={pathGenerator}
          hoverdPref={hoverdPref}
          onHover={onHover}
          selectedWord={selectedWord}
          onWordClick={onWordClick}
        />
      ))}
      {hoverdPref != null && (
        <MunicipalityMap_detail
          idx={"hoverPref"}
          feature={hoverdPref}
          pathGenerator={pathGenerator}
          hoverdPref={hoverdPref}
          onHover={onHover}
          selectedWord={selectedWord}
          onWordClick={onWordClick}
        />
      )}
    </g>
  );
};

export default MunicipalityMap;
