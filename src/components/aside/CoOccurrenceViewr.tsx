import { Help } from "@mui/icons-material";
import { Box, Tooltip, Typography } from "@mui/material";
import { useEffect, useState, type FC } from "react";
import useSWR from "swr";
import { wordCloudDataFetcher } from "./wordCloudDataFetcher";

interface CooccurrenceData {
  vocab: string[];
  cooccurrence_matrix: number[][];
}

type Props = {
  selectedWord: string;
  selectedPref?: string;
  setHoveredPref: (value: string | null) => void;
};

export const CoOccurrenceViewr: FC<Props> = ({
  selectedWord,
  selectedPref,
  setHoveredPref,
}) => {
  const { data, isLoading } = useSWR<Record<string, Record<string, number>>>(
    selectedPref || "all",
    wordCloudDataFetcher
  );

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

  return (
    <>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h6" marginTop={1}>
          共起度上位単語
        </Typography>
        <Tooltip
          title="その言葉と同時に表示されやすい単語"
          arrow
          placement="top"
        >
          <Help />
        </Tooltip>
      </Box>
      <Box
        height={350}
        sx={{
          overflowY: "auto",
          border: "1px solid #ccc",
          mb: 2,
        }}
      >
        <ul>
          {rankedWords.map(({ word, score }) => (
            <li
              key={word}
              onMouseEnter={() => setHoveredPref(word)}
              onMouseLeave={() => setHoveredPref(null)}
            >
              {word}（共起回数: {score}）
            </li>
          ))}
        </ul>
      </Box>
    </>
  );
};
