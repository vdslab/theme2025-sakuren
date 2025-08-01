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
  mode: boolean;
  onMode: () => void;
  handleWordClick: (opt: string | null) => void;
  selectedMap: string | null;
}

const WordSearch = ({
  uniqueWords,
  selected,
  onChange,
  mode,
  onMode,
  handleWordClick,
  selectedMap,
}: WordSearchProps) => {
  // selected が null でなければ、options から該当するものを探す
  const selectedOption = useMemo(
    () => uniqueWords.find((opt) => opt.value === selected) ?? null,
    [uniqueWords, selected]
  );
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
                  onMode();
                  if (!checked) {
                    handleWordClick(null);
                  }
                }}
                color="primary"
              />
            }
            label="都道府県選択モード"
          />
          <Autocomplete
            options={[
              "愛知県",
              "秋田県",
              "青森県",
              "千葉県",
              "愛媛県",
              "福井県",
              "福岡県",
              "福島県",
              "岐阜県",
              "群馬県",
              "広島県",
              "北海道",
              "兵庫県",
              "茨城県",
              "石川県",
              "岩手県",
              "香川県",
              "鹿児島県",
              "神奈川県",
              "高知県",
              "熊本県",
              "京都府",
              "三重県",
              "宮城県",
              "宮崎県",
              "長野県",
              "長崎県",
              "奈良県",
              "新潟県",
              "大分県",
              "岡山県",
              "沖縄県",
              "大阪府",
              "佐賀県",
              "埼玉県",
              "滋賀県",
              "島根県",
              "静岡県",
              "栃木県",
              "徳島県",
              "東京都",
              "鳥取県",
              "富山県",
              "和歌山県",
              "山形県",
              "山口県",
              "山梨県",
            ]}
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
        </FormControl>
      </Box>
    </Box>
  );
};

export default WordSearch;
