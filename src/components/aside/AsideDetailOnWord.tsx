import { Box, Typography } from "@mui/material";
import type { FC } from "react";
import useSWR from "swr";
import type { WordListData } from "../../types/wordListData";
import { BarChart } from "../chart/BarChart";

type Props = {
  selectedWord: string;
  selectedPref?: string;
  setHoveredPref: (value: string | null) => void;
};

export const AsideDetailOnWord: FC<Props> = ({
  selectedWord,
  selectedPref,
  setHoveredPref,
}) => {
  const { data, isLoading } = useSWR<WordListData>(
    selectedPref || "all",
    async (key: string) => {
      return fetch(`/word_lists/${key}.json`).then((res) => res.json());
    }
  );

  if (isLoading || !data) {
    return <Box>Loading...</Box>;
  }

  const prefScore = Object.entries(data).reduce((acc, [pref, obj]) => {
    acc[pref] = obj[selectedWord] || 0;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(prefScore)
    .map(([pref, score]) => ({
      label: pref,
      value: score * 100,
      color: "#4CAF50",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Box>
      <Typography variant="h6">検索ワード：{selectedWord}</Typography>
      <Box
        height={400}
        sx={{
          overflowY: "auto",
          border: "1px solid #ccc",
        }}
      >
        <BarChart
          data={chartData}
          width={350}
          unit="Score"
          onHover={(label) => setHoveredPref(label)}
        />
      </Box>
    </Box>
  );
};
