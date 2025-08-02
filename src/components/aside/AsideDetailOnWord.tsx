import { Help } from "@mui/icons-material";
import { Box, Tooltip, Typography } from "@mui/material";
import type { FC } from "react";
import useSWR from "swr";
import { BarChart } from "../chart/BarChart";
import { wordCloudDataFetcher } from "./wordCloudDataFetcher";

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
  const { data, isLoading } = useSWR<Record<string, Record<string, number>>>(
    selectedPref || "all",
    wordCloudDataFetcher
  );

  if (isLoading || !data) {
    return <Box>Loading...</Box>;
  }

  const chartData = Object.entries(data)
    .map(([label, value]) => ({
      label,
      value: value[selectedWord] || 0,
      color: "#4CAF50",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
      >
        <Typography variant="h6">検索ワード：{selectedWord}</Typography>
        <Tooltip
          title={`各地域の口コミ総数に対する${selectedWord}のTF-IDFスコア`}
          arrow
          placement="top"
          sx={{ marginRight: 2 }}
        >
          <Help />
        </Tooltip>
      </Box>
      <Box
        height={400}
        sx={{
          overflowY: "auto",
          border: "1px solid #ccc",
        }}
      >
        <BarChart
          data={chartData}
          width={375}
          unit={"TF-IDF\nScore"}
          onHover={(label) => setHoveredPref(label)}
        />
      </Box>
    </Box>
  );
};
