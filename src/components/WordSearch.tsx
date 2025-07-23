import Select from "react-select";

interface Option {
  value: string;
  label: string;
}

interface WordSearchProps {
  uniqueWords: Option[]; // [{ value: "東京", label: "東京" }, ...]
  selected: string | null;
  onChange: (value: string | null) => void;
  onMode:() => void;
}

const WordSearch = ({ uniqueWords, selected, onChange,onMode }: WordSearchProps) => {
  // selected が null でなければ、options から該当するものを探す
  const selectedOption =
    uniqueWords.find((opt) => opt.value === selected) ?? null;

  return (
    <div style={{ position: "absolute", zIndex: 10, padding: "10px" }}>
      <Select
        options={uniqueWords}
        value={selectedOption} // ←ここ
        onChange={(select) => {
          console.log(select);
          onChange(select ? select.value : null);
        }}
        isClearable
        placeholder="単語を検索..."
        styles={{ container: (base) => ({ ...base, width: 300 }) }}
      />
      <button onClick={()=>onMode()}>Mode Change</button>
    </div>
  );
};

export default WordSearch;
