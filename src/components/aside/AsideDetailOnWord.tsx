import { Box, Typography } from "@mui/material";
import type { FC } from "react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import type { WordLayoutData } from "../../types/wordLayoutData";
import { BarChart } from "../chart/BarChart";

interface CooccurrenceData {
  vocab: string[];
  cooccurrence_matrix: number[][];
}

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
  // 共起行列データ状態管理
  const [matrixData, setMatrixData] = useState<CooccurrenceData | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [errorMatrix, setErrorMatrix] = useState<string | null>(null);

  // 共起行列JSONをfetchしてセット
  useEffect(() => {
    setLoadingMatrix(true);
    fetch("/cooccurrence_matrix_all_pref.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch cooccurrence matrix");
        return res.json();
      })
      .then((data: CooccurrenceData) => {
        setMatrixData(data);
        setLoadingMatrix(false);
      })
      .catch((e) => {
        setErrorMatrix(e.message);
        setLoadingMatrix(false);
      });
  }, []);

  // TF-IDFデータをSWでfetch
  const { data, isLoading } = useSWR<Record<string, Record<string, number>>>(
    selectedPref || "all",
    async (key: string) => {
      if (key === "all") {
        return fetch(`/data/wordcloud_layout.json`)
          .then((res) => res.json())
          .then((data: WordLayoutData[]) => {
            return data.reduce((acc: any, item) => {
              acc[item.name] = item.data.reduce((a: any, c) => {
                a[c.word] = c.tfidf_score;
                return a;
              }, {});
              return acc;
            }, {});
          });
      } else {
        return fetch(
          `/data/wordcloud_map_layer/${key}/wordcloud_layout_detail.json`
        )
          .then((res) => res.json())
          .then((data: WordLayoutData[]) => {
            return data.reduce((acc: any, item) => {
              acc[item.name] = item.data.reduce((a: any, c) => {
                a[c.word] = c.tfidf_score;
                return a;
              }, {});
              return acc;
            }, {});
          });
      }
    }
  );

  // 読み込み状態・エラー処理
  if (loadingMatrix) {
    return <Box>共起行列データを読み込み中...</Box>;
  }
  if (errorMatrix) {
    return <Box>共起行列データの読み込みエラー: {errorMatrix}</Box>;
  }
  if (!matrixData) {
    return <Box>共起行列データがありません</Box>;
  }
  if (isLoading || !data) {
    return <Box>TF-IDFデータを読み込み中...</Box>;
  }

  // 選択単語の共起行列インデックスを取得
  const selectedIndex = matrixData.vocab.findIndex((w) => w === selectedWord);
  if (selectedIndex === -1) {
    return <Box>選択単語が共起行列に存在しません</Box>;
  }

  // 共起度上位20単語を計算
  const cooccurRow = matrixData.cooccurrence_matrix[selectedIndex];
  const rankedWords = matrixData.vocab
    .map((word, idx) => ({ word, score: cooccurRow[idx] }))
    .filter(({ word, score }) => word !== selectedWord && score > 0)
    .sort((a, b) => b.score - a.score);

  // チャート表示用データ作成
  const chartData = Object.entries(data)
    .map(([label, value]) => ({
      label,
      value: value[selectedWord] || 0,
      color: "#4CAF50",
    }))
    .sort((a, b) => b.value - a.value);
  console.log(rankedWords);
  return (
    <Box>
      <Typography variant="h6">検索ワード：{selectedWord}</Typography>
      <Box
        height={400}
        sx={{
          overflowY: "auto",
          border: "1px solid #ccc",
          mb: 2,
        }}
      >
        <BarChart
          data={chartData}
          width={350}
          unit={"TF-IDF\nScore"}
          onHover={(label) => setHoveredPref(label)}
        />
      </Box>
      <Box
        height={400}
        sx={{
          overflowY: "auto",
          border: "1px solid #ccc",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1">共起度上位単語</Typography>
        <ul>
          {rankedWords.map(({ word, score }) => (
            <li
              key={word}
              onMouseEnter={() => setHoveredPref(word)}
              onMouseLeave={() => setHoveredPref(null)}
              style={{ cursor: "pointer" }}
            >
              {word}（共起回数: {score}）
            </li>
          ))}
        </ul>
      </Box>
    </Box>
  );
};
