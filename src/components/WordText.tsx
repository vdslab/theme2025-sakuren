import type { MouseEvent } from "react";
import "../css/WordCloudCanvas.css";
import type { WordLayoutDetailData } from "../types/wordLayoutData";
interface WordTextProps {
  item: WordLayoutDetailData;
  groupBounds: { xlim: [number, number]; ylim: [number, number] };
  mode: boolean;
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
  groupBounds,
  mode,
  selectedWord,
  findword,
  onWordClick,
  hoveredPref,
  onHover,
  groupName,
  precipitationScale,
  precipitationValue,
}: WordTextProps) => {
  const angle = angleMap[item.orientation?.toString() ?? "0"] ?? 0;

  const x =
    groupBounds.xlim[0] +
    (groupBounds.xlim[1] - groupBounds.xlim[0]) * item.norm_x;

  const y =
    groupBounds.ylim[0] +
    (groupBounds.ylim[1] - groupBounds.ylim[0]) * item.norm_y;

  const onClick = (e: MouseEvent<SVGTextElement>) => {
    if (mode) {
      onWordClick(item.word);
      e.stopPropagation();
    }
  };

  return (
    <text
      className={
        mode ? "word-text" : hoveredPref == groupName ? "word-texts" : ""
      }
      x={x}
      y={item.orientation == 2 ? y - (item.font_size / 2) * 1.6 : y}
      fontSize={item.font_size}
      fill={
        precipitationScale != null
          ? precipitationScale(precipitationValue ?? 0)
          : "#ffffff"
      }
      opacity={findword || !selectedWord ? 1 : 0.25}
      textAnchor="start"
      dominantBaseline="hanging"
      transform={`rotate(${angle}, ${x}, ${y})`}
      onClick={onClick}
      onMouseEnter={() => {
        onHover(groupName);
      }}
      onMouseLeave={() => {
        onHover(null);
      }}
      style={
        selectedWord == item.word
          ? {
              fontFamily: '"游ゴシック", YuGothic, sans-serif',
              cursor: "pointer",
              textShadow: "1px 1px 2px black",
            }
          : {
              fontFamily: '"游ゴシック", YuGothic, sans-serif',
              cursor: "pointer",
            }
      }
    >
      {item.word}
    </text>
  );
};

export default WordText;
