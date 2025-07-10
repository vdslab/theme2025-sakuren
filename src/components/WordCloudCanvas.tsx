import * as d3 from "d3";
import * as d3geo from "d3-geo";
import { useEffect, useRef, useState } from "react";
import WordText from "./WordText";
interface CanvasWordCloudProps {
  wordData: any[];
  bounds: Record<string, any>;
  selectedWord: string | null;
  onWordClick: (word: string) => void;
}

const WordCloudCanvas = ({
  wordData,
  bounds,
  selectedWord,
  onWordClick,
}: CanvasWordCloudProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [commonBounds, setCommonBounds] = useState<any>( bounds);

  const allFontSizes = wordData.flatMap((group) =>
    group.data.map((d) => d.font_size)
  );

  // GeoJSONをfetch
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson")
      .then((res) => res.json())
      .then((data) => setGeoFeatures(data.features));
  }, []);


  // Zoom設定
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
  }, []);

  if (!commonBounds) return <div>Loading...</div>;

  return (
    <svg
      ref={svgRef}
      style={{
        border: "1px solid #ccc",
        width: "calc(100vw - 40px)",
        height: "calc(100vh - 20px)",
        display: "block",
      }}
    >
      <g ref={gRef}>
        {wordData.map((group, gIdx) => {
          const groupBounds = bounds[group.name];
          if (!groupBounds) return null;

          const geoFeature = geoFeatures.find(
            (f) => f.properties.nam_ja === group.name
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


          // 座標スケールはpixel_bounds_dict（bounds[group.name]）に基づく
          const xScale = d3
            .scaleLinear()
            .domain(group.data[0].print_area_x)
            .range([groupBounds.xlim[0]+10,groupBounds.xlim[1]-10])
            .nice();

          const yScale = d3
            .scaleLinear()
            .domain(group.data[0].print_area_y)
            .range(groupBounds.ylim)
            .nice();

          const fontScale = d3
            .scaleLinear()
            .domain(d3.extent(allFontSizes) as [number, number])
            .range(group.name === "北海道" ? [1, 40] : [1, 10]);

          const findword = group.data.some((item) => item.word === selectedWord);

          return (
            <g key={gIdx}>
              {/* 都道府県の外枠パス */}
              <path
                d={pathGenerator(geoFeature) || ""}
                fill="none"
                stroke="#333"
                strokeWidth={1}
              />
              {/* WordCloud 単語描画 */}
              {group.data.map((item, iIdx) => (
                <WordText
                  key={`${gIdx}-${iIdx}`}
                  item={item}
                  xScale={xScale}
                  yScale={yScale}
                  fontScale={fontScale}
                  selectedWord={selectedWord}
                  findword={findword}
                  onWordClick={onWordClick}
                />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default WordCloudCanvas;
