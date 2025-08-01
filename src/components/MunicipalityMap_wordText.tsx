import * as d3 from "d3";
import "../css/WordCloudCanvas.css";
import type { WordLayoutDetailData } from "../types/wordLayoutData";

interface MunicipalityMapWordTextProps {
  selectedWord: string | null;
  groupName: string;
  boundsArray: [[number, number], [number, number]];
  onWordClick: (word: string) => void;
  onHover: (word: string | null) => void;
  targetParts: WordLayoutDetailData[];
}

const angleMap: Record<string, number> = {
  null: 0,
  "0": 0,
  "1": -90,
  "2": 90,
  "3": 180,
};

const MunicipalityMap_wordText = ({
  selectedWord,
  groupName,
  boundsArray,
  onHover,
  onWordClick,
  targetParts,
}: MunicipalityMapWordTextProps) => {
  const boundsWidth = boundsArray[1][0] - boundsArray[0][0];

  return (
    <>
      {targetParts.map((word, idx) => {
        const xScale = d3
          .scaleLinear<number>()
          .domain(word.print_area_x)
          .range([boundsArray[0][0], boundsArray[1][0]]);
        const yScale = d3
          .scaleLinear<number>()
          .domain(word.print_area_y)
          .range([boundsArray[0][1], boundsArray[1][1]]);

        const angle = angleMap[word.orientation?.toString() ?? "0"] ?? 0;
        const x = xScale(word.x);
        const y = yScale(word.y);

        const fontSize =
          ((word.font_size / word.print_area_x[1]) * boundsWidth) / 1.1;
        console.log(x, y, word, fontSize);

        const onClick = (e: React.MouseEvent<SVGTextElement>) => {
          onWordClick(word.word);
          e.stopPropagation();
        };

        return (
          <text
            className="word-text"
            key={`${word.word}-${idx}`} // ← 修正
            x={x}
            y={word.orientation == 2 ? y - fontSize : y}
            fontSize={fontSize}
            transform={`rotate(${angle}, ${x}, ${y})`}
            fill="#3a6fa1"
            textAnchor="start"
            alignmentBaseline="text-before-edge"
            onMouseEnter={() => onHover(groupName)}
            onMouseLeave={() => onHover(null)}
            onClick={onClick}
            style={{
              fontFamily: '"游ゴシック", YuGothic, sans-serif',
              cursor: "pointer",
              ...(selectedWord == word.word
                ? { textShadow: "1px 1px 2px black" }
                : {}),
            }}
          >
            {word.word}
          </text>
        );
      })}
    </>
  );
};
export default MunicipalityMap_wordText;
