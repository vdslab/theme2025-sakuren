import { useEffect, useState } from "react";
import type { GeoProperty } from "../types/geoProperty";
import type {
  WordLayoutData,
  WordLayoutDetailData,
} from "../types/wordLayoutData";
import MunicipalityMap_wordText from "./MunicipalityMap_wordText";
type MunicipalityMapDetailProps = {
  idx: number | string;
  feature: GeoJSON.Feature<GeoJSON.Geometry, GeoProperty>;
  pathGenerator: d3.GeoPath<void, d3.GeoPermissibleObjects>;
  hoverdPref: string | null;
  onHover: (word: string | null) => void;
  selectedWord: string | null;
  onWordClick: (word: string) => void;
};

const MunicipalityMap_detail = ({
  idx,
  feature,
  pathGenerator,
  hoverdPref,
  onHover,
  selectedWord,
  onWordClick,
}: MunicipalityMapDetailProps) => {
  const boundsArray = pathGenerator?.bounds(feature);
  const [wordcloud, setWordcloud] = useState<WordLayoutData[]>([]);
  const [targetParts, setTargetParts] = useState<WordLayoutDetailData[]>([]);

  useEffect(() => {
    if (!feature) return;
    const prefName = feature.properties.N03_001;
    const filepath = `/data/wordcloud_map_layer/${prefName}/wordcloud_layout_detail.json`;

    fetch(filepath)
      .then((res) => res.json())
      .then((data) => setWordcloud(data))
      .catch((err) => console.error("Wordcloud fetch error:", err));
  }, [feature]);

  useEffect(() => {
    if (!feature || wordcloud.length === 0) return;

    const { N03_003, N03_004 } = feature.properties;
    const partsNameRaw =
      N03_003?.endsWith("市") || N03_003?.endsWith("郡") ? N03_003 : N03_004;
    const partsName = partsNameRaw?.trim();

    const matched = wordcloud.find((item) => item.name.trim() === partsName);
    if (matched) {
      setTargetParts(matched.data);
    } else {
      setTargetParts([]);
    }
  }, [feature, wordcloud]);

  if (!targetParts) return null;
  const findword = targetParts.some(
    (item: WordLayoutDetailData) => item.word === selectedWord
  );
  const name = feature.properties.N03_004;
  return (
    <g key={name + idx} opacity={findword || !selectedWord ? 1 : 0.25}>
      <path
        d={pathGenerator(feature) || ""}
        fill="#fff"
        stroke="#444"
        strokeWidth={feature.properties.N03_001 != "東京都" ? 0.5 : 0.05}
        filter={
          hoverdPref === name && feature.properties.N03_001 != "東京都"
            ? "url(#shadow)"
            : undefined
        }
        onMouseEnter={() => {
          onHover(name);
        }}
        onMouseLeave={() => {
          onHover(null);
        }}
        style={{ zIndex: hoverdPref === name ? 1 : 0 }}
      />
      <MunicipalityMap_wordText
        selectedWord={selectedWord}
        groupName={name}
        boundsArray={boundsArray}
        onHover={onHover}
        onWordClick={onWordClick}
        targetParts={targetParts}
      />
    </g>
  );
};
export default MunicipalityMap_detail;
