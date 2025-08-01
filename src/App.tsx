import { useEffect, useMemo, useState } from "react";
import { useToggle } from "react-use";
import { Aside } from "./components/aside/Aside";
import CanvasWordCloud from "./components/WordCloudCanvas";
import type { WordBoundsData } from "./types/wordBoundsData";
import type { WordLayoutData } from "./types/wordLayoutData";

export const App = () => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [mode, setMode] = useToggle(true);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [hoveredPref, setHoveredPref] = useState<string | null>(null);
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
      {wordData && wordBounds && (
        <CanvasWordCloud
          wordData={wordData}
          selectedMap={selectedMap}
          setSelectedMap={setSelectedMap}
          hoveredPref={hoveredPref}
          setHoveredPref={setHoveredPref}
          bounds={wordBounds}
          selectedWord={selectedWord}
          onWordClick={(word) => setSelectedWord(word)}
          mode={mode}
          setMode={(boo) => setMode(boo)}
          setSelectedWord={(opt) => setSelectedWord(opt)}
          uniqueWords={uniqueWords}
        />
      )}
      {selectedWord && (
        <Aside
          selectedWord={selectedWord}
          selectedPref={selectedMap ?? ""}
          setHoveredPref={setHoveredPref}
        />
      )}
    </>
  );
};

export default App;
