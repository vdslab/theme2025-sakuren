import { Box } from "@mui/material";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WeatherDataRaw } from "../types/weatherData";
import type { WordBoundsData } from "../types/wordBoundsData";
import type { WordLayoutData } from "../types/wordLayoutData";
import { HoveredTooltip } from "./HoveredTooltip";
import MunicipalityMap from "./MunicipalityMap";
import wordcloudDraw from "./WordCloudDraw";
import WordSearch from "./WordSearch";
import { Aside } from "./aside/Aside";

interface Option {
  value: string;
  label: string;
}
interface CanvasWordCloudProps {
  wordData: WordLayoutData[];
  bounds: WordBoundsData; // bounds[prefCode].bbox = [x0, y0, x1, y1]
  selectedMap: string | null;
  setSelectedMap: (value: string | null) => void;
  selectedWord: string | null;
  hoveredPref: string | null;
  setHoveredPref: (value: string | null) => void;
  onWordClick: (word: string) => void;
  isWordSelectMode: boolean;
  setIsWordSelectMode: (boo: boolean) => void;
  setSelectedWord: (value: string | null) => void;
  uniqueWords: Option[]; // [{ value: "東京", label: "東京" }, ...]
}

type WeatherData = Record<
  string,
  { temperature: number; precipitation: number }
>;

const WordCloudCanvas = ({
  wordData,
  bounds,
  selectedMap,
  setSelectedMap,
  hoveredPref,
  setHoveredPref,
  selectedWord,
  onWordClick,
  isWordSelectMode,
  setIsWordSelectMode,
  setSelectedWord,
  uniqueWords,
}: CanvasWordCloudProps) => {
  const [useWordData, setUseWordData] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [geoFeatures, setGeoFeatures] = useState<
    GeoJSON.Feature<GeoJSON.Geometry, { N03_001: string }>[]
  >([]);
  const [weatherData, setWeatherData] = useState<WeatherData>({});
  const [temperatureScale, setTemperatureScale] = useState<
    d3.ScaleLinear<string, string, never> | undefined
  >(undefined);
  const [precipitationScale, setPrecipitationScale] = useState<
    d3.ScaleLinear<string, string, never> | undefined
  >(undefined);
  const commonBounds = bounds;

  const [tooltipValue, setTooltipValue] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // --- Hoverイベント ---
  const onHover = (value: string | null) => {
    setHoveredPref(value);
    setTooltipValue(value);
  };

  // --- JSONデータ読み込み ---
  useEffect(() => {
    fetch("/weather_by_prefecture.json")
      .then((res) => res.json())
      .then((raw: WeatherDataRaw[]) => {
        const cleaned = raw
          .filter(
            (d) =>
              d.都道府県 &&
              !isNaN(parseFloat(d.avg_temperature?.toString() || ""))
          )
          .map((d) => ({
            都道府県: d.都道府県,
            Yearly_precipitation: parseFloat(
              d["Yearly precipitation"]?.toString() || "0"
            ),
            avg_temperature: parseFloat(
              d["avg_temperature"]?.toString() || "0"
            ),
          }));
        // weatherData を { '東京都': { avg_temperature: ..., Yearly_precipitation: ... } } にする
        const cleanedDict = cleaned.reduce((acc: WeatherData, cur) => {
          acc[cur.都道府県] = {
            temperature: cur.avg_temperature,
            precipitation: cur.Yearly_precipitation,
          };
          return acc;
        }, {});

        setWeatherData(cleanedDict);
      });
  }, []);

  // ✅ weatherData に依存して scale を構築
  useEffect(() => {
    if (!weatherData || Object.keys(weatherData).length === 0) return;

    const values = Object.values(weatherData);

    const temperatureExtent = d3.extent(
      values,
      (d: { temperature: number; precipitation: number }) => d.temperature
    ) as [number, number];

    const precipitationExtent = d3.extent(
      values,
      (d: { temperature: number; precipitation: number }) => d.precipitation
    ) as [number, number];

    const temperatureScales = d3
      .scaleLinear<string>()
      .domain(temperatureExtent)
      .range(["#ffffff", "#fc9272"]);

    const precipitationScales = d3
      .scaleLinear<string>()
      .domain(precipitationExtent)
      .range(["#3a6fa1", "#3a6fa1"]);

    setTemperatureScale(() => temperatureScales);
    setPrecipitationScale(() => precipitationScales);
  }, [weatherData]);

  // --- GeoJSONの読み込み ---
  useEffect(() => {
    fetch("/pref_hex_merged_todouhuken.geojson")
      .then((res) => res.json())
      .then((data) => setGeoFeatures(data.features));
  }, []);

  // --- 初期描画位置 ---
  const initialTransform = useMemo(
    () => d3.zoomIdentity.translate(-300, -100).scale(0.5),
    []
  );

  // 共通のズームリセット（デフォルト倍率へ戻す）
  const resetZoom = useCallback(
    (animate: boolean = true) => {
      if (!svgRef.current || !zoomRef.current) return;

      const svg = d3.select(svgRef.current);

      if (animate) {
        svg
          .transition()
          .duration(750)
          .call(
            (transition) =>
              zoomRef.current?.transform(
                transition as d3.Transition<
                  SVGSVGElement,
                  unknown,
                  null,
                  undefined
                >,
                initialTransform
              ),
            initialTransform
          );
      } else {
        zoomRef.current.transform(svg, initialTransform);
      }
    },
    [initialTransform]
  );

  // --- 初期ズーム設定 ---
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const g = d3.select<SVGGElement, unknown>(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 30])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);

        // ✅ ズーム倍率に応じてデータを切り替え
        if (event.transform.k >= 2) {
          setUseWordData(1);
        } else {
          setUseWordData(0);
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // 初期位置とスケール設定
    resetZoom(false);

    // cleanup
    return () => {
      svg.on(".zoom", null);
    };
  }, [wordData, resetZoom]);

  useEffect(() => {
    if (selectedWord != null && selectedMap == null) {
      resetZoom(true);
    }
  }, [selectedWord, selectedMap, resetZoom]);

  const handleZoomToPrefecture = (prefName: string | null) => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current || !zoomRef.current) return;

    if (!prefName) {
      if (selectedMap != null) {
        resetZoom(true);
      }

      return;
    }

    const bound = bounds[prefName];

    if (!bound || !svgRef.current || !zoomRef.current) return;

    const [x0, x1] = bound.xlim;
    const [y0, y1] = bound.ylim;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const prefWidth = x1 - x0;
    const prefHeight = y1 - y0;

    const paddingFactor = 0.55;
    const scale =
      Math.min(width / prefWidth, height / prefHeight) * paddingFactor;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const tx = width / 2 - scale * cx - 200;
    const ty = height / 2 - scale * cy + 200;

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);

    svg
      .transition()
      .duration(750)
      .call(
        (transition) =>
          zoomRef.current?.transform(
            transition as d3.Transition<
              SVGSVGElement,
              unknown,
              null,
              undefined
            >,
            transform
          ),
        transform
      );
  };

  // --- onWordClickとズーム処理を合わせるラッパー ---
  const handleWordClick = (name: string | null) => {
    onHover(null);
    setSelectedWord(null);
    setSelectedMap(name);
    handleZoomToPrefecture(name);
  };

  const resetSelect = () => {
    setSelectedWord(null);
    setSelectedMap(null);
    resetZoom(true);
  };

  if (!commonBounds) return <div>Loading...</div>;

  return (
    <>
      <Box
        onMouseMove={(e) => {
          setMousePos({ x: e.clientX + 10, y: e.clientY + 10 });
        }}
      >
        <svg
          ref={svgRef}
          width={3000}
          height={3000}
          style={{
            border: "1px solid #ccc",
            width: "calc(100vw)",
            height: "calc(100vh)",
            display: "block",
          }}
        >
          <defs>
            <filter id="shadow">
              {hoveredPref?.endsWith("都") ||
              hoveredPref?.endsWith("県") ||
              hoveredPref?.endsWith("府") ||
              hoveredPref?.endsWith("道") ? (
                <feDropShadow
                  dx="2"
                  dy="2"
                  stdDeviation="5"
                  floodColor="#000"
                  floodOpacity="0.7"
                />
              ) : (
                <feDropShadow
                  dx="0.1"
                  dy="0.1"
                  stdDeviation="1"
                  floodColor="#000"
                  floodOpacity="1"
                />
              )}
            </filter>
          </defs>
          <g>
            {selectedMap == null ? (
              <g ref={gRef}>
                {wordData.map((group, gIdx) =>
                  wordcloudDraw({
                    bounds,
                    useWordData,
                    group,
                    geoFeatures,
                    gIdx,
                    selectedWord,
                    hoveredPref,
                    isWordSelectMode,
                    onHover,
                    onWordClick,
                    handleWordClick,
                    temperatureScale,
                    precipitationScale,
                    weatherData,
                  })
                )}
              </g>
            ) : (
              <g ref={gRef}>
                <MunicipalityMap
                  selectedWord={selectedWord}
                  bounds={bounds}
                  group={selectedMap}
                  onChange={(opt) => {
                    setSelectedMap(opt);
                  }}
                  gIdx={48}
                  hoverdPref={hoveredPref}
                  onHover={onHover}
                  onWordClick={onWordClick}
                />
              </g>
            )}
          </g>
        </svg>
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
            selected={selectedWord}
            onChange={(opt) => setSelectedWord(opt)}
            isWordSelectMode={isWordSelectMode}
            setIsWordSelectMode={setIsWordSelectMode}
            handleWordClick={(opt) => handleWordClick(opt)}
            selectedMap={selectedMap}
            setSelectedMap={setSelectedMap}
            resetZoom={resetZoom}
          />
        </div>
        {tooltipValue && (
          <HoveredTooltip value={tooltipValue} mousePos={mousePos} />
        )}
      </Box>
      <Aside
        selectedWord={selectedWord}
        selectedPref={selectedMap ?? ""}
        setHoveredPref={setHoveredPref}
        resetSelect={resetSelect}
      />
    </>
  );
};

export default WordCloudCanvas;
