import * as d3geo from "d3-geo";
import type { MouseEvent } from "react";
import type { WordBoundsData } from "../types/wordBoundsData";
import type {
  WordLayoutData,
  WordLayoutDetailData,
} from "../types/wordLayoutData";
import WordText from "./WordText";

interface WordCloudDrawProps {
  bounds: WordBoundsData;
  useWordData: number;
  group: WordLayoutData | null;
  geoFeatures: GeoJSON.Feature<GeoJSON.Geometry, { N03_001: string }>[];
  gIdx: number;
  selectedWord: string | null;
  hoveredPref: string | null;
  isWordSelectMode: boolean;
  onWordClick: (word: string) => void;
  onHover: (value: string | null) => void;
  handleWordClick: (value: string | null) => void;
  temperatureScale: d3.ScaleLinear<string, string, never> | undefined;
  precipitationScale: d3.ScaleLinear<string, string, never> | undefined;
  weatherData: Record<string, { temperature: number; precipitation: number }>;
  markerPref: Array<string>;
}

const WordCloudDraw = ({
  bounds,
  useWordData,
  group,
  geoFeatures,
  gIdx,
  selectedWord,
  hoveredPref,
  isWordSelectMode,
  onWordClick,
  onHover,
  handleWordClick,
  // temperatureScale,
  precipitationScale,
  weatherData,
  markerPref,
}: WordCloudDrawProps) => {
  if (!group) return null;
  const groupBounds = bounds[group.name];
  if (!groupBounds) return null;

  const geoFeature = geoFeatures.find(
    (f) => f["properties"]["N03_001"] === group.name
  );
  if (!geoFeature) return null;

  const projection = d3geo
    .geoIdentity()
    .reflectY(true)
    .fitExtent(
      [
        [groupBounds.xlim[0], groupBounds.ylim[0]],
        [groupBounds.xlim[1], groupBounds.ylim[1]],
      ],
      geoFeature
    );

  const pathGenerator = d3geo.geoPath().projection(projection);
  const findword = group.data.some(
    (item: WordLayoutDetailData) => item.word === selectedWord
  );

  const centroid = pathGenerator.centroid(geoFeature);
  const centerX = centroid[0];
  const centerY = centroid[1];

  // 天気データ取得
  const weather = weatherData[group.name];
  // const tempColor =
  //   weather && temperatureScale != null
  //     ? temperatureScale(weather.temperature)
  //     : "#ffffff";

  const onClick = (e: MouseEvent<SVGTextElement>) => {
    if (!isWordSelectMode) {
      handleWordClick(hoveredPref ?? null);
      e.stopPropagation();
    }
  };

  return (
    <g
      key={gIdx}
      transform={
        hoveredPref === group.name && !isWordSelectMode
          ? `translate(${centerX}, ${centerY}) scale(1.1) translate(${-centerX}, ${-centerY})`
          : `translate(0, 0) scale(1)`
      }
      onClick={onClick}
      onMouseEnter={() => onHover(group.name)}
      onMouseLeave={() => onHover(null)}
    >
      <path
        opacity={!selectedWord || findword ? 0.75 : 0.25}
        d={pathGenerator(geoFeature) || ""}
        fill="#d8f2d8ff"
        stroke={markerPref.includes(group.name) ? "#ff0000" : "#333"}
        strokeWidth={markerPref.includes(group.name) ? 4 : 1}
        pointerEvents="visibleFill"
        filter={hoveredPref === group.name ? "url(#shadow)" : undefined}
      />

      {group.data.map((item: WordLayoutDetailData, iIdx: number) => (
        <WordText
          key={`${gIdx}-${iIdx}`}
          iIdx={iIdx}
          useWordData={useWordData}
          item={item}
          groupBounds={groupBounds}
          isWordSelectMode={isWordSelectMode}
          selectedWord={selectedWord}
          findword={findword}
          onWordClick={onWordClick}
          hoveredPref={hoveredPref}
          onHover={onHover}
          groupName={group.name}
          precipitationScale={precipitationScale}
          precipitationValue={weather?.precipitation}
        />
      ))}
    </g>
  );
};

export default WordCloudDraw;
