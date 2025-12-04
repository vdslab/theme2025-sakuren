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
  // boundsArray,
  onHover,
  onWordClick,
  targetParts,
}: MunicipalityMapWordTextProps) => {
  // const boundsWidth = boundsArray[1][0] - boundsArray[0][0];
  return (
    <>
      {targetParts.map((word, idx) => {
        // const xScale = d3
        //   .scaleLinear<number>()
        //   .domain([0, 3000])
        //   .range([0, 3000]);
        // const yScale = d3
        //   .scaleLinear<number>()
        //   .domain([0, 3000])
        //   .range([0, 3000]);

        const angle = angleMap[word.orientation?.toString() ?? "0"] ?? 0;
        const x = word.x;
        const y = word.y;

        const fontSize = word.font_size;

        const onClick = (e: React.MouseEvent<SVGTextElement>) => {
          onWordClick(word.word);
          e.stopPropagation();
        };

        return (
          <text
            className="word-text"
            key={`${word.word}-${idx}`}
            x={x / 2}
            y={word.orientation == 2 ? y / 2 - fontSize / 2.6 : y / 2}
            fontSize={fontSize / 2.6}
            transform={`rotate(${angle}, ${x / 2}, ${y / 2})`}
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
