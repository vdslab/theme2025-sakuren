import Select from "react-select";

interface WordSearchProps {
  wordData: any[];
  onChange: (value: string | null) => void;
}

const WordSearch = ({ wordData, onChange }: WordSearchProps) => {
  const allWords = Array.from(
    new Set(wordData.flatMap((g) => g.data.map((d) => d.word)))
  ).sort();

  const options = allWords.map((w) => ({ value: w, label: w }));

  return (
    <div style={{ position: "absolute", zIndex: 10, padding: "10px" }}>
      <Select
        options={options}
        onChange={(selected) => onChange(selected ? selected.value : null)}
        isClearable
        placeholder="単語を検索..."
        styles={{ container: (base) => ({ ...base, width: 300 }) }}
      />
    </div>
  );
};

export default WordSearch;
