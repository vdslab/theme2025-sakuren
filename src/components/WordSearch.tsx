import {
  Autocomplete,
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
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
  mode: boolean;
  setMode: (boo: boolean) => void;
  handleWordClick: (opt: string | null) => void;
  selectedMap: string | null;
  setSelectedMap: (opt: string | null) => void;
}

const WordSearch = ({
  uniqueWords,
  selected,
  onChange,
  mode,
  setMode,
  handleWordClick,
  selectedMap,
  setSelectedMap,
}: WordSearchProps) => {
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (selectedMap === null) {
      setSelectedMunicipalities(null);
    }
  }, [selectedMap]);

  const handleModeChange = () => {
    setMode(!mode);
  };

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
    <Box
      sx={{
        zIndex: 10,
        paddingX: "5px",
        paddingY: "65px",
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Autocomplete
        options={uniqueWords}
        getOptionLabel={(option) => option.label}
        value={selectedOption ?? null}
        onChange={(_, newValue) => {
          onChange(newValue ? newValue.value : null);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="単語を選択..."
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
      <Box>
        <FormControl>
          <FormControlLabel
            control={
              <Switch
                onChange={(_, checked: boolean) => {
                  handleModeChange();
                  if (!checked) {
                    handleWordClick(null);
                  }
                }}
                color="primary"
                checked={!mode}
              />
            }
            label="都道府県選択モード"
          />
        </FormControl>
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
              label="都道府県を選択..."
              variant="outlined"
              style={{ width: 300 }}
              size="small"
            />
          )}
          disabled={mode}
          style={mode ? { opacity: 0.5 } : { opacity: 1 }}
          isOptionEqualToValue={(option, value) => option === value}
          renderOption={(props, option) => <li {...props}>{option}</li>}
        />
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
              setMode(false);
            } else {
              setSelectedMap(null);
              handleWordClick(null);
              setMode(true);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="市区町村から都道府県を選択..."
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
    </Box>
  );
};

export default WordSearch;
