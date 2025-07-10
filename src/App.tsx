import { useState } from "react";
import Select from "react-select";
import CanvasWordCloud from "./components/WordCloudCanvas";
import word_bounds from "./data/prefecture_pixel_map_bounds.json";
import wordData from "./data/wordcloud_layout.json";

const uniqueWords = Array.from(
  new Set(wordData.flatMap((g) => g.data.map((d) => d.word)))
).map((w) => ({ value: w, label: w }));

export const App = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          width: 300,
        }}
      >
        <Select
          options={uniqueWords}
          onChange={(opt) => setSelected(opt?.value ?? null)}
          isClearable
          placeholder="キーワードを検索"
        />
      </div>
      <CanvasWordCloud
        wordData={wordData}
        bounds={word_bounds}
        selectedWord={selected}
        onWordClick={(word) => setSelected(word)}
      />
    </>
  );
};

export default App;
