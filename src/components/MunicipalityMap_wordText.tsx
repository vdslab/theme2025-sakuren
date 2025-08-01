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

  useEffect(() => {
    if (!groupName) return;
    const prefName = groupName.properties.N03_001;
    const filepath = `/data/wordcloud_map_layer/${prefName}/wordcloud_layout_detail.json`;

    fetch(filepath)
      .then((res) => res.json())
      .then((data) => setWordcloud(data))
      .catch((err) => console.error("Wordcloud fetch error:", err));
  }, [groupName]);

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

  const boundsWidth = boundsArray[1][0] - boundsArray[0][0];
  const boundsHeight = boundsArray[1][1] - boundsArray[0][1];

  return (
    <>
      {targetParts.map((word, idx) => {
        const xScale = d3
          .scaleLinear()
          .domain(word["print_area_x"])
          .range([boundsArray[0][0] + 1, boundsArray[1][0] - 1]);
        const yScale = d3
          .scaleLinear()
          .domain(word["print_area_y"])
          .range([boundsArray[0][1] + 1, boundsArray[1][1]]);

        const angle = angleMap[word.orientation?.toString() ?? "0"] ?? 0;
        const x = xScale(word.x);
        const y = yScale(word.y);

        const fontSize =
          (word.font_size / word["print_area_x"][1]) * (boundsWidth - 4);

        return (
          <text
            key={idx}
            x={x}
            y={y}
            fontSize={fontSize}
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
