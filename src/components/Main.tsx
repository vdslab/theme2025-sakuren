import { Box } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useToggle } from "react-use";

import { useLocation } from "react-router";
import { getPref } from "../constant/prefectures";
import type { WordBoundsData } from "../types/wordBoundsData";
import type { WordLayoutData } from "../types/wordLayoutData";
import { Header } from "./Header/Header";
import CanvasWordCloud from "./WordCloudCanvas";

export const Main = () => {
  // 選択モード
  const [isWordSelectMode, setIsWordSelectMode] = useToggle(true);

  // 選択情報
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [hoveredPref, setHoveredPref] = useState<string | null>(null);
  const [markerPref, setMarkerPref] = useState<Array<string>>([]);

  // データ保持
  const [wordData, setWordData] = useState<WordLayoutData[]>([]);
  const [wordBounds, setWordBounds] = useState<WordBoundsData>({});

  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const pref = params.getAll("prefecture").map(Number);
    setMarkerPref(pref.map(getPref).filter((p) => p !== null));
  }, [search]);

  useEffect(() => {
    fetch("/data/wordcloud_layout.json")
      .then((res) => res.json())
      .then((data) => setWordData(data));

    fetch("/data/prefecture_pixel_map_bounds_all.json")
      .then((res) => res.json())
      .then((data) => setWordBounds(data));
  }, []);

  const uniqueWords = useMemo(() => {
    if (!wordData) return [];
    return Array.from(
      new Set(wordData.map((d) => d.data.map((item) => item.word)).flat())
    ).map((w) => ({ value: w, label: w }));
  }, [wordData]);

  const onWordClick = (word: string) => {
    if (word === selectedWord) {
      setSelectedWord(null);
    } else {
      setSelectedWord(word);
    }
  };

  return (
    <Box
      onClick={() => {
        setSelectedWord(null);
      }}
    >
      <Header />
      {wordData.length !== 0 && Object.keys(wordBounds).length !== 0 && (
        <CanvasWordCloud
          wordData={wordData}
          selectedMap={selectedMap}
          setSelectedMap={setSelectedMap}
          hoveredPref={hoveredPref}
          setHoveredPref={setHoveredPref}
          bounds={wordBounds}
          selectedWord={selectedWord}
          onWordClick={onWordClick}
          isWordSelectMode={isWordSelectMode}
          setIsWordSelectMode={setIsWordSelectMode}
          setSelectedWord={(opt) => setSelectedWord(opt)}
          uniqueWords={uniqueWords}
          markerPref={markerPref}
        />
      )}
    </Box>
  );
};
