import { Box, Paper, Typography } from "@mui/material";
import { type FC } from "react";
import { AsideDetailOnPrefecture } from "./AsideDetailOnPrefecture";
import { AsideDetailOnWord } from "./AsideDetailOnWord";
import { CoOccurrenceViewr } from "./CoOccurrenceViewr";

type AsideProps = {
  selectedWord: string | null;
  selectedPref?: string;
  setHoveredPref: (value: string | null) => void;
};

export const Aside: FC<AsideProps> = ({
  selectedWord,
  selectedPref,
  setHoveredPref,
}) => {
  if (!selectedWord && !selectedPref) {
    return null;
  }

  return (
    <Paper
      sx={{
        zIndex: 10,
        position: "absolute",
        top: 64,
        right: 0,
        height: "calc(100% - 64px)",
        width: 500,
        padding: 2,
        boxShadow: "-5px 0 10px rgba(0, 0, 0, 0.2)",
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Box>
        <Typography variant="h5">詳細</Typography>
        {selectedPref && (
          <Typography variant="h6">選択中の都道府県：{selectedPref}</Typography>
        )}
        {selectedWord ? (
          <>
            <AsideDetailOnWord
              selectedWord={selectedWord}
              selectedPref={selectedPref}
              setHoveredPref={setHoveredPref}
            />
            <CoOccurrenceViewr
              selectedWord={selectedWord}
              selectedPref={selectedPref}
              setHoveredPref={setHoveredPref}
            />
          </>
        ) : (
          selectedPref && (
            <AsideDetailOnPrefecture
              selectedPref={selectedPref}
              setHoveredPref={setHoveredPref}
            />
          )
        )}
      </Box>
    </Paper>
  );
};
