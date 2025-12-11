import { ZoomOut } from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { prefectures } from "../constant/prefectures";
import { prefectureToMunicipalitiesMap } from "../constant/prefectureToMunicipalitiesMap";

interface Option {
  value: string;
  label: string;
}

interface WordSearchProps {
  uniqueWords: Option[]; // [{ value: "東京", label: "東京" }, ...]
  selected: string | null;
  onChange: (value: string | null) => void;
  isWordSelectMode: boolean;
  setIsWordSelectMode: (boo: boolean) => void;
  handleWordClick: (opt: string | null) => void;
  selectedMap: string | null;
  setSelectedMap: (opt: string | null) => void;
  resetZoom: () => void;
}

const WordSearch = ({
  uniqueWords,
  selected,
  onChange,
  isWordSelectMode,
  setIsWordSelectMode,
  handleWordClick,
  selectedMap,
  setSelectedMap,
  resetZoom,
}: WordSearchProps) => {
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (selectedMap === null) {
      setSelectedMunicipalities(null);
    }
  }, [selectedMap]);

  const selectedOption = useMemo(
    () => uniqueWords.find((opt) => opt.value === selected) ?? null,
    [uniqueWords, selected]
  );

  const municipalityOptions = useMemo(() => {
    const items: string[] = Object.entries(
      prefectureToMunicipalitiesMap
    ).flatMap(([prefecture, municipalities]) =>
      municipalities.map((municipality) => `${prefecture}_${municipality}`)
    );

    return items;
  }, []);

  return (
    <Paper
      sx={{
        zIndex: 10,
        position: "absolute",
        top: 70,
        left: 10,
        padding: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        boxShadow: "0px 6px 20px rgba(0,0,0,0.2)",
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Box>
        <Typography variant="caption" color="textSecondary">
          モード選択
        </Typography>
        <ToggleButtonGroup
          color="primary"
          value={isWordSelectMode ? "word" : "prefecture"}
          exclusive
          onChange={(_, newValue) => {
            if (newValue === null) return;

            setIsWordSelectMode(newValue === "word");
            if (newValue === "word") {
              handleWordClick(null);
            }
          }}
          fullWidth
          size="small"
        >
          <ToggleButton
            value="word"
            style={
              isWordSelectMode
                ? {
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    transition: "0.2s",
                  }
                : {}
            }
          >
            単語選択モード
          </ToggleButton>
          <ToggleButton
            value="prefecture"
            style={
              !isWordSelectMode
                ? {
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    transition: "0.2s",
                  }
                : {}
            }
          >
            都道府県選択モード
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box>
        <Typography variant="caption" color="textSecondary">
          単語を選択
        </Typography>
        <Autocomplete
          options={uniqueWords}
          getOptionLabel={(option) => option.label}
          value={selectedOption}
          onChange={(_, newValue) => {
            onChange(newValue ? newValue.value : null);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="単語を選択..."
              variant="outlined"
              style={{ width: 300 }}
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderOption={(props, option) => (
            <li {...props} key={props.key}>
              {option.label}
            </li>
          )}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="textSecondary">
          都道府県を選択
        </Typography>
        <Autocomplete
          options={prefectures}
          getOptionLabel={(option) => option}
          value={selectedMap}
          onChange={(_, newValue) => {
            handleWordClick(newValue ? newValue : null);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="都道府県を選択..."
              variant="outlined"
              style={{ width: 300 }}
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option === value}
          renderOption={(props, option) => <li {...props}>{option}</li>}
        />
      </Box>
      <Box>
        <Typography variant="caption" color="textSecondary">
          市区町村から都道府県を選択
        </Typography>
        <Autocomplete
          options={municipalityOptions}
          getOptionLabel={(option) => option.split("_")[1]}
          value={selectedMunicipalities}
          onChange={(_, newValue) => {
            setSelectedMunicipalities(newValue);
            if (newValue) {
              const pref = newValue.split("_")[0];
              setSelectedMap(pref);
              handleWordClick(pref);
              setIsWordSelectMode(false);
            } else {
              setSelectedMap(null);
              handleWordClick(null);
              setIsWordSelectMode(true);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="市区町村から都道府県を選択..."
              variant="outlined"
              style={{ width: 300 }}
              size="small"
            />
          )}
          isOptionEqualToValue={(option, value) => option === value}
          groupBy={(option) => option.split("_")[0]}
          renderGroup={(params) => (
            <li key={params.key}>
              <div style={{ fontWeight: "bold", padding: "4px 8px" }}>
                {params.group}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {params.children}
              </ul>
            </li>
          )}
        />
      </Box>
      <Button onClick={resetZoom} variant="contained" sx={{ marginTop: 2 }}>
        ズームリセット
        <ZoomOut />
      </Button>
    </Paper>
  );
};

export default WordSearch;
