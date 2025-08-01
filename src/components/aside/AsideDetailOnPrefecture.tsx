import { Box } from "@mui/material";
import type { FC } from "react";
import useSWR from "swr";
import type { WordLayoutData } from "../../types/wordLayoutData";
import { BarChart } from "../chart/BarChart";

type Props = {
  selectedPref: string;
  setHoveredPref: (value: string | null) => void;
};

export const AsideDetailOnPrefecture: FC<Props> = ({
  selectedPref,
  setHoveredPref,
}) => {
  const calcChartDataObject = (data: WordLayoutData[]) => {
    const obj = {} as Record<string, Record<string, number>>;
    data.forEach((item) => {
      const { name, data: value } = item;
      obj[name] = value.reduce((acc, cur) => {
        acc[cur.word] = cur.tfidf_score;
        return acc;
      }, {} as Record<string, number>);
    });
    return obj;
  };

  const { data, isLoading } = useSWR<Record<string, Record<string, number>>>(
    "all",
    async (key: string) => {
      if (key === "all") {
        return fetch(`/data/wordcloud_layout.json`)
          .then((res) => res.json())
          .then((data) => calcChartDataObject(data));
      } else {
        return fetch(
          `/data/wordcloud_map_layer/${key}/wordcloud_layout_detail.json`
        )
          .then((res) => res.json())
          .then((data) => calcChartDataObject(data));
      }
    }
  );

  if (isLoading || !data) {
    return <Box>Loading...</Box>;
  }

  const chartData = Object.entries(data[selectedPref])
    .map(([label, value]) => ({
      label,
      value,
      color: "#4CAF50",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Box>
      <Box
        height={400}
        sx={{
          overflowY: "auto",
          border: "1px solid #ccc",
        }}
      >
        <BarChart
          data={chartData}
          width={400}
          unit={"TF-IDF\nScore"}
          onHover={(label) => setHoveredPref(label)}
        />
      </Box>
    </Box>
  );
};
