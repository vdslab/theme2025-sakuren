import { useEffect, useState } from "react";
interface MunicipalityMapWordTextProps {
  groupName: any; // GeoJSON Feature
  boundsArray:any
}
const angleMap: Record<string, number> = {
  null: 0,
  "0": 0,
  "1": -90,
  "2": 90,
  "3": 180,
};

const MunicipalityMap_wordText = ({ groupName ,boundsArray}: MunicipalityMapWordTextProps) => {
  const [wordcloud, setWordcloud] = useState<any[]>([]);
  const [targetParts, setTargetParts] = useState<any[]>([]);
  
  // --- 1. WordCloud JSON 読み込み ---
  useEffect(() => {
    if (!groupName) return;
    const prefName = groupName.properties.N03_001;
    const filepath = `/wordcloud_map_layer/${prefName}/wordcloud_layout_detail.json`;

    fetch(filepath)
      .then((res) => res.json())
      .then((data) => setWordcloud(data))
      .catch((err) => console.error("Wordcloud fetch error:", err));
  }, [groupName]);

  // --- 2. 表示対象の市区町村名に合致するワードクラウドの抽出 ---
  useEffect(() => {
  if (!groupName || wordcloud.length === 0) return;

  const { N03_003, N03_004 } = groupName.properties;
  const partsNameRaw = N03_003?.endsWith("市") || N03_003?.endsWith("群") ? N03_003 : N03_004;
  const partsName = partsNameRaw?.trim();

  const matched = wordcloud.find((item) => item.name.trim() === partsName);
  
  if (matched) {
    setTargetParts(matched.data);
  } else {
    setTargetParts([])
  }
}, [groupName, wordcloud]);

  if (!targetParts ) return null;
  
  return (
    <>
      {targetParts.map((word: any, idx: number) => {
        const angle = angleMap[word.orientation?.toString() ?? "0"] ?? 0;
        const x = boundsArray[0][0] +(boundsArray[1][0] -boundsArray[0][0]) *word.norm_x
        const y = boundsArray[0][1] +(boundsArray[1][1] -boundsArray[0][1]) *word.norm_y
        console.log(x,y)
        return (
        <text
            key={idx}
            x={word.orientation == "2" ? x+2 :x}
            y={word.orientation == "2" ? y - (word.font_size / 2.1 /2) : y+2}
            fontSize={word.font_size/2.1}
            transform={`rotate(${angle}, ${x}, ${y})`}
            fill={word.color ?? "#000"}
            textAnchor="start"
            alignmentBaseline="central"
        >
            {word.word}
        </text>
        );

      })}
    </>
  );
};

export default MunicipalityMap_wordText;
