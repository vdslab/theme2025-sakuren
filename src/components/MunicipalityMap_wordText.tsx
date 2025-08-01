import * as d3 from "d3";
import { useEffect, useState } from "react";
import type {
  WordLayoutData,
  WordLayoutDetailData,
} from "../types/wordLayoutData";
interface MunicipalityMapWordTextProps {
  groupName: any; // GeoJSON Feature
  boundsArray: any;
}
const angleMap: Record<string, number> = {
  null: 0,
  "0": 0,
  "1": -90,
  "2": 90,
  "3": 180,
};

const MunicipalityMap_wordText = ({
  groupName,
  boundsArray,
}: MunicipalityMapWordTextProps) => {
  const [wordcloud, setWordcloud] = useState<WordLayoutData[]>([]);
  const [targetParts, setTargetParts] = useState<WordLayoutDetailData[]>([]);

  // --- 1. WordCloud JSON 読み込み ---
  useEffect(() => {
    if (!groupName) return;
    const prefName = groupName.properties.N03_001;
    const filepath = `/data/wordcloud_map_layer/${prefName}/wordcloud_layout_detail.json`;

    fetch(filepath)
      .then((res) => res.json())
      .then((data) => {
        setWordcloud(data);
        console.log("Wordcloud data loaded:", data);
      })
      .catch((err) => console.error("Wordcloud fetch error:", err));
  }, [groupName]);

  // --- 2. 表示対象の市区町村名に合致するワードクラウドの抽出 ---
  useEffect(() => {
    if (!groupName || wordcloud.length === 0) return;

    const { N03_003, N03_004 } = groupName.properties;
    const partsNameRaw =
      N03_003?.endsWith("市") || N03_003?.endsWith("郡") ? N03_003 : N03_004;
    const partsName = partsNameRaw?.trim();

    const matched = wordcloud.find((item) => item.name.trim() === partsName);

    if (matched) {
      setTargetParts(matched.data);
    } else {
      setTargetParts([]);
    }
  }, [groupName, wordcloud]);

  if (!targetParts) return null;

  return (
    <>
      {targetParts.map((word: any, idx: number) => {
        console.log(targetParts);
        const xScale = d3
          .scaleLinear<number, number>()
          .domain(word["print_area_x"])
          .range([boundsArray[0][0], boundsArray[1][0] - 0.5]);

        const yScale = d3
          .scaleLinear<number, number>()
          .domain(word["print_area_y"])
          .range([boundsArray[0][1] + 1, boundsArray[1][1]]);
        const angle = angleMap[word.orientation?.toString() ?? "0"] ?? 0;
        const x = xScale(word.x);
        const y = yScale(word.y);
        console.log(x, y);
        return (
          <text
            key={idx}
            x={x}
            y={
              word.orientation == "2"
                ? y -
                  (word.font_size / word["print_area_x"][1]) *
                    (boundsArray[1][0] - boundsArray[0][0] - 3)
                : y
            }
            fontSize={
              (word.font_size / word["print_area_x"][1]) *
              (boundsArray[1][0] - boundsArray[0][0] - 4)
            }
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
