import { useState } from "react";
import CanvasWordCloud from "./components/WordCloudCanvas";
import word_bounds from "./data/prefecture_pixel_map_bounds.json";
import wordData from "./data/wordcloud_layout.json";
import WordSearch from "./components/WordSearch";
const uniqueWords = Array.from(
  new Set(wordData.flatMap((g) => g.data.map((d) => d.word)))
).map((w) => ({ value: w, label: w }));
export const App = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode,setMode]=useState<boolean>(true)

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
        <WordSearch
          uniqueWords={uniqueWords}
          selected={selected}
          onChange={(opt) => setSelected(opt)}
          onMode={()=>setMode(!mode?true:false)}
        />
      </div>
      <CanvasWordCloud
        wordData={wordData}
        bounds={word_bounds}
        selectedWord={selected}
        onWordClick={(word) => setSelected(word)}
        mode={mode}
      />
    </>
  );
};

export default App;
