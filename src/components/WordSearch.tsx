import {
  Autocomplete,
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import { useMemo } from "react";

interface Option {
  value: string;
  label: string;
}

interface WordSearchProps {
  uniqueWords: Option[]; // [{ value: "東京", label: "東京" }, ...]
  selected: string | null;
  onChange: (value: string | null) => void;
  onMode: () => void;
}

const WordSearch = ({
  uniqueWords,
  selected,
  onChange,
  onMode,
}: WordSearchProps) => {
  // selected が null でなければ、options から該当するものを探す
  const selectedOption = useMemo(
    () => uniqueWords.find((opt) => opt.value === selected) ?? null,
    [uniqueWords, selected]
  );

  return (
    <Box style={{ position: "absolute", zIndex: 10, padding: "10px" }}>
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
        renderOption={(props, option) => <li {...props}>{option.label}</li>}
      />
      <Box>
        <FormControl>
          <FormControlLabel
            control={<Switch onChange={onMode} color="primary" />}
            label="都道府県選択モード"
          />
        </FormControl>
      </Box>
    </Box>
  );
};

export default WordSearch;
