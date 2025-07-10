interface WordTextProps {
  item: any;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  fontScale: d3.ScaleLinear<number, number>;
  selectedWord: string | null;
  findword:boolean;
  onWordClick: (word: string) => void;
}

const angleMap: Record<string, number> = {
  null: 0,
  "0": 0,
  "1": 90,
  "2": -90,
  "3": 270,
};

const WordText = ({
  item,
  xScale,
  yScale,
  fontScale,
  selectedWord,
  findword,
  onWordClick,
}: WordTextProps) => {
  const angle = angleMap[item.orientation?.toString() ?? "0"] ?? 0;
  const x = xScale(item.x) 
  const y = yScale(item.y) 
  const fontSize = fontScale(item.font_size);

  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fill={item.color}
      opacity={findword||!selectedWord ? 1 : 0.25}
      textAnchor="start"
      dominantBaseline="hanging"
      transform={`rotate(${angle}, ${x}, ${y})`}
      onClick={() => onWordClick(item.word)}
      style={{
        fontFamily: '"游ゴシック", YuGothic, sans-serif',
        cursor: "pointer",
      }}
    >
      {item.word}
    </text>
  );
};

export default WordText;
