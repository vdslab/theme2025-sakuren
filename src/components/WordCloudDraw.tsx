import * as d3geo from "d3-geo";
import WordText from "./WordText";

interface WordCloudDrawProps {
  bounds: Record<string, any>;
  group: any;
  geoFeatures: any[];
  gIdx: number;
  selectedWord: string | null;
  hoveredPref: object;
  mode: boolean;
  onWordClick: (word: string) => void;
  onHover: (value: object) => void;
  handleWordClick: (value: object) => void;
  temperatureScale;
  precipitationScale;
  weatherData: Record<string, { temperature: number; precipitation: number }>;
}

const WordCloudDraw = ({
  bounds,
  group,
  geoFeatures,
  gIdx,
  selectedWord,
  hoveredPref,
  mode,
  onWordClick,
  onHover,
  handleWordClick,
  temperatureScale,
  precipitationScale,
  weatherData,
}: WordCloudDrawProps) => {
  const groupBounds = bounds[group.name];
  if (!groupBounds) return null;

  const geoFeature = geoFeatures.find(
    (f) => f.properties.N03_001 === group.name
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
  const findword = group.data.some((item: any) => item.word === selectedWord);

  const centroid = pathGenerator.centroid(geoFeature);
  const centerX = centroid[0];
  const centerY = centroid[1];

  // 天気データ取得
  const weather = weatherData[group.name];
  const tempColor = weather && temperatureScale!=null ? temperatureScale(weather.temperature) : "#ffffff";

  return (
    <g
      key={gIdx}
      transform={
        hoveredPref?.name === group.name && !mode
          ? `translate(${centerX}, ${centerY}) scale(1.1) translate(${-centerX}, ${-centerY})`
          : `translate(0, 0) scale(1)`
      }
      onClick={() => !mode && handleWordClick(hoveredPref)}
    >
      <path
        opacity={!selectedWord || findword ? 1 : 0.25}
        d={pathGenerator(geoFeature) || ""}
        fill={tempColor}
        stroke="#333"
        strokeWidth={1}
        pointerEvents="visibleFill"
        onMouseEnter={() => onHover(group)}
        onMouseLeave={() => onHover({})}
        filter={hoveredPref === group.name ? "url(#shadow)" : undefined}
      />

      {group.data.map((item: any, iIdx: number) => (
        <WordText
          key={`${gIdx}-${iIdx}`}
          item={item}
          groupBounds={groupBounds}
          mode={mode}
          selectedWord={selectedWord}
          findword={findword}
          onWordClick={onWordClick}
          hoveredPref={hoveredPref}
          onHover={onHover}
          groupName={group}
          precipitationScale={precipitationScale}
          precipitationValue={weather?.precipitation}
        />
      ))}
    </g>
  );
};

export default WordCloudDraw;
