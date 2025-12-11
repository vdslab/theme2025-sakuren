import { Close } from "@mui/icons-material";
import { Box, Button, Paper, Typography } from "@mui/material";
import { type FC } from "react";
import { AsideDetailOnPrefecture } from "./AsideDetailOnPrefecture";
import { AsideDetailOnWord } from "./AsideDetailOnWord";

type AsideProps = {
  selectedWord: string | null;
  selectedPref?: string;
  setHoveredPref: (value: string | null) => void;
  resetSelect: () => void;
};

export const Aside: FC<AsideProps> = ({
  selectedWord,
  selectedPref,
  setHoveredPref,
  resetSelect,
}) => {
  const desiredOpen = Boolean(selectedWord || selectedPref);

  return (
    <Paper
      sx={{
        zIndex: 10,
        position: "absolute",
        top: 64,
        right: 0,
        height: "calc(100% - 64px)",
        width: desiredOpen ? 500 : 0,
        paddingX: desiredOpen ? 2 : 0,
        paddingY: desiredOpen ? 1 : 0,
        boxShadow: "-5px 0 10px rgba(0, 0, 0, 0.2)",
        overflowY: "hidden",
        transition: "width 0.2s, padding 0.2s",
        willChange: "width, padding",
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {desiredOpen && (
        <Box>
          <Box display="flex" justifyContent="space-between">
            <Box>
              <Typography variant="h5">詳細</Typography>
              {selectedPref && (
                <Typography variant="h6">
                  選択中の都道府県：{selectedPref}
                </Typography>
              )}
            </Box>
            <Button onClick={resetSelect}>
              選択解除
              <Close />
            </Button>
          </Box>
          {selectedWord ? (
            <AsideDetailOnWord
              selectedWord={selectedWord}
              selectedPref={selectedPref}
              setHoveredPref={setHoveredPref}
            />
          ) : (
            selectedPref && (
              <AsideDetailOnPrefecture
                selectedPref={selectedPref}
                setHoveredPref={setHoveredPref}
              />
            )
          )}
        </Box>
      )}
    </Paper>
  );
};
