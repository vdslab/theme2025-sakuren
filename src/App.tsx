import { useEffect, useMemo, useState } from "react";
import { useToggle } from "react-use";
import CanvasWordCloud from "./components/WordCloudCanvas";
import WordSearch from "./components/WordSearch";
import type { WordBoundsData } from "./types/wordBoundsData";
import type { WordLayoutData } from "./types/wordLayoutData";

export const App = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useToggle(true);

  const [wordData, setWordData] = useState<WordLayoutData[] | undefined>(
    undefined
  );
  const [wordBounds, setWordBounds] = useState<WordBoundsData>({});
  useEffect(() => {
    fetch("/data/wordcloud_layout.json")
      .then((res) => res.json())
      .then((data) => setWordData(data));

    fetch("/data/prefecture_pixel_map_bounds.json")
      .then((res) => res.json())
      .then((data) => setWordBounds(data));
  }, []);

  const uniqueWords = useMemo(() => {
    if (!wordData) return [];
    return Array.from(
      new Set(wordData.map((d) => d.data.map((item) => item.word)).flat())
    ).map((w) => ({ value: w, label: w }));
  }, [wordData]);

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
          onMode={() => setMode(!mode ? true : false)}
        />
      </div>
      {wordData && wordBounds && (
        <CanvasWordCloud
          wordData={wordData}
          bounds={wordBounds}
          selectedWord={selected}
          onWordClick={(word) => setSelected(word)}
          mode={mode}
        />
      )}
    </>
  );
};

export default App;
