import { Box, Paper, Typography } from "@mui/material";
import { useState, type FC } from "react";
import { AsideDetailOnWord } from "./AsideDetailOnWord";

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
  const [isWordMode, setIsWordMode] = useState<boolean>(true);
  return (
    <Paper
      sx={{
        zIndex: 10,
        position: "absolute",
        top: 0,
        right: 0,
        height: "100%",
        width: 450,
        padding: 2,
        boxShadow: "-5px 0 10px rgba(0, 0, 0, 0.2)",
      }}
    >
      <Box>
        <Typography variant="h5">詳細</Typography>
        {isWordMode ? (
          selectedWord && (
            <AsideDetailOnWord
              selectedWord={selectedWord}
              selectedPref={selectedPref}
              setHoveredPref={setHoveredPref}
            />
          )
        ) : (
          <Typography variant="body1">Preference Details</Typography>
        )}
      </Box>
    </Paper>
  );
};
