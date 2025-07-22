import "../css/WordCloudCanvas.css";
interface WordTextProps {
  item: any;
  groupBounds: { xlim: [number, number]; ylim: [number, number] };
  fontScale: d3.ScaleLinear<number, number>;
  selectedWord: string | null;
  findword: boolean;
  onWordClick: (word: string) => void;
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
  fontScale,
  selectedWord,
  findword,
  onWordClick,
}: WordTextProps) => {
  const angle = angleMap[item.orientation?.toString() ?? "0"] ?? 0;

  const x =
    groupBounds.xlim[0] +
    (groupBounds.xlim[1] - groupBounds.xlim[0]) * item.norm_x;

  const y =
    groupBounds.ylim[0] +
    (groupBounds.ylim[1] - groupBounds.ylim[0]) * item.norm_y;

  return (
    <text
      className="word-text"
      x={x}
      y={item.orientation == "2" ? y - (item.font_size / 2) * 1.6 : y}
      fontSize={item.font_size}
      fill={item.color}
      opacity={findword || !selectedWord ? 1 : 0.25}
      textAnchor="start"
      dominantBaseline="hanging"
      transform={`rotate(${angle}, ${x}, ${y})`}
      onClick={() => onWordClick(item.word)}
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
