import * as d3 from "d3";
import { useEffect, useRef } from "react";
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

  const allFontSizes = wordData.flatMap((group) =>
    group.data.map((d) => d.font_size)
  );

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

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 1000"
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

          const xScale = d3
            .scaleLinear()
            .domain([0, 3000])
            .range(groupBounds.xlim)
            .nice();

          const yScale = d3
            .scaleLinear()
            .domain([0, 3000])
            .range(groupBounds.ylim)
            .nice();

          let fontScale = d3
            .scaleLinear()
            .domain(d3.extent(allFontSizes) as [number, number])
            .range(group.name === "北海道" ? [1, 40] : [1, 10]);

          return (
            <g key={gIdx}>
              {group.data.map((item, iIdx) => (
                <WordText
                  key={`${gIdx}-${iIdx}`}
                  item={item}
                  xScale={xScale}
                  yScale={yScale}
                  fontScale={fontScale}
                  selectedWord={selectedWord}
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
