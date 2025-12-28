import type { MouseEvent } from "react";
import "../css/WordCloudCanvas.css";
import type { WordLayoutDetailData } from "../types/wordLayoutData";
interface WordTextProps {
  item: WordLayoutDetailData;
  iIdx: number;
  useWordData: number;
  groupBounds: { xlim: [number, number]; ylim: [number, number] };
  isWordSelectMode: boolean;
  selectedWord: string | null;
  findword: boolean;
  onWordClick: (word: string) => void;
  onHover: (word: string | null) => void;
  hoveredPref: string | null;
  groupName: string | null;
  precipitationScale: d3.ScaleLinear<string, string, never> | undefined;
  precipitationValue: number | undefined;
}

const angleMap: Record<string, number> = {
  null: 0,
  "0": 0,
  "1": -90,
  "2": 90,
  "3": 180,
};

const WordText = ({
  item,
  // iIdx,
  // useWordData,
  // groupBounds,
  isWordSelectMode,
  selectedWord,
  findword,
  onWordClick,
  hoveredPref,
  onHover,
  groupName,
}: // precipitationScale,
// precipitationValue,
WordTextProps) => {
  const angle = angleMap[item.orientation?.toString() ?? "0"] ?? 0;

  const x = item.norm_x;

  const y = item.norm_y;

  const onClick = (e: MouseEvent<SVGTextElement>) => {
    if (isWordSelectMode) {
      onWordClick(item.word);
      e.stopPropagation();
    }
  };
  // if (useWordData == 0) {
  //   if (item.font_size < 13) {
  //     return <></>;
  //   }
  // }
  return (
    <text
      className={
        isWordSelectMode
          ? "word-text"
          : hoveredPref == groupName
          ? "word-texts"
          : ""
      }
      x={x}
      y={y}
      fontSize={item.font_size}
      fill="#000000"
      opacity={findword || !selectedWord ? 1 : 0.25}
      textAnchor={angle == 0 ? "start" : "end"}
      dominantBaseline="hanging"
      transform={`rotate(${angle * 3}, ${x}, ${y})`}
      onClick={onClick}
      onMouseEnter={() => {
        onHover(groupName);
      }}
      onMouseLeave={() => {
        onHover(null);
      }}
      style={{
        fontFamily: '"游ゴシック"',
        cursor: "pointer",
        textShadow: selectedWord == item.word ? "1px 1px 2px black" : "none",
        userSelect: "none",
      }}
    >
      {item.word}
    </text>
  );
};

export default WordText;
