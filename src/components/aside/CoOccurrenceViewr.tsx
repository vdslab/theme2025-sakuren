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
  selectedWord: string | null;
  setHoveredPref: (value: string | null) => void;
  setCrossHighlightPrefs: (prefs: Set<string>) => void;
};

export const CoOccurrenceViewr: FC<Props> = ({
  selectedWord,
  setHoveredPref,
  setCrossHighlightPrefs,
}) => {
  const { data, isLoading } = useSWR<Record<string, Record<string, number>>>(
    "all",
    wordCloudDataFetcher
  );

  // 共起行列データ状態管理
  const [matrixData, setMatrixData] = useState<CooccurrenceData | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [errorMatrix, setErrorMatrix] = useState<string | null>(null);

  const [crossSelectWord, setCrossSelectWord] = useState<string | null>(null);

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

  if (!selectedWord) {
    return;
  }

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

  const prefCount = Object.values(data).reduce(
    (acc, cur) => acc + (cur[selectedWord] ? 1 : 0),
    0
  );

  const calcCrossHighlightPrefs = (word: string) => {
    if (crossSelectWord === word) {
      setCrossHighlightPrefs(new Set());
      setCrossSelectWord(null);
      return;
    }

    const prefs = Object.entries(data)
      .filter((values) => values[1][word] > 0 && values[1][selectedWord] > 0)
      .map(([pref]) => pref);
    setCrossSelectWord(word);
    setCrossHighlightPrefs(new Set(prefs));
  };

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
              onClick={() => calcCrossHighlightPrefs(word)}
              style={{
                cursor: "pointer",
                padding: "2px 8px",
                borderBottom: "1px solid #eee",
                backgroundColor:
                  crossSelectWord === word ? "#f0f0f0" : "transparent",
              }}
            >
              {word}（共起回数: {score}/{prefCount}）
            </li>
          ))}
        </ul>
      </Box>
    </>
  );
};
