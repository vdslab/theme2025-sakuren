import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { WeatherDataRaw } from "../types/weatherData";
import type { WordLayoutData } from "../types/wordLayoutData";
import MunicipalityMap from "./MunicipalityMap";
import wordcloudDraw from "./WordCloudDraw";

interface CanvasWordCloudProps {
  wordData: WordLayoutData[];
  bounds: Record<string, any>; // bounds[prefCode].bbox = [x0, y0, x1, y1]
  selectedWord: string | null;
  onWordClick: (word: string) => void;
  mode: boolean;
}

type WeatherData = Record<
  string,
  { temperature: number; precipitation: number }
>;

const WordCloudCanvas = ({
  wordData,
  bounds,
  selectedWord,
  onWordClick,
  mode,
}: CanvasWordCloudProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [hoveredPref, setHoveredPref] = useState<WordLayoutData | null>(null);
  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<WordLayoutData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData>({});
  const [temperatureScale, setTemperatureScale] = useState<
    d3.ScaleLinear<string, string, never> | undefined
  >(undefined);
  const [precipitationScale, setPrecipitationScale] = useState<
    d3.ScaleLinear<string, string, never> | undefined
  >(undefined);
  const commonBounds = bounds;

  // --- Hoverイベント ---
  const onHover = (value: WordLayoutData | null) => {
    setHoveredPref(value);
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

    const temperatureExtent = d3.extent(values, (d: any) => d.temperature) as [
      number,
      number
    ];

    const precipitationExtent = d3.extent(
      values,
      (d: any) => d.precipitation
    ) as [number, number];

    const temperatureScales = d3
      .scaleLinear<string>()
      .domain(temperatureExtent)
      .range(["#fee5d9", "#fc9272"]);

    const precipitationScales = d3
      .scaleLinear<string>()
      .domain(precipitationExtent)
      .range(["#6baed6", "#08306b"]);

    setTemperatureScale(() => temperatureScales);
    setPrecipitationScale(() => precipitationScales);
  }, [weatherData]);

  // --- GeoJSONの読み込み ---
  useEffect(() => {
    fetch("/prefecture_single.geojson")
      .then((res) => res.json())
      .then((data) => setGeoFeatures(data.features));
  }, []);

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
      });

    svg.call(zoom);
    zoomRef.current = zoom;
  }, []);

  // --- Prefectureにズームする関数 ---
  const handleZoomToPrefecture = (prefName: string) => {
    const svg = d3.select(svgRef.current);
    const bound = bounds[prefName];
    if (!bound || !svgRef.current || !zoomRef.current) return;

    const [x0, x1] = bound.xlim;
    const [y0, y1] = bound.ylim;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const prefWidth = x1 - x0;
    const prefHeight = y1 - y0;

    const scale = Math.min(width / prefWidth, height / prefHeight) * 0.8;
    const tx = width - scale * (x0 + prefWidth / 2);
    const ty = height - scale * (y0 + prefHeight / 2);

    svg
      .transition()
      .duration(750)
      .call(
        (transition) =>
          zoomRef.current?.transform(
            transition as any,
            d3.zoomIdentity.translate(tx, ty).scale(scale)
          ),
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
  };

  // --- onWordClickとズーム処理を合わせるラッパー ---
  const handleWordClick = (value: WordLayoutData | null) => {
    onHover(null);
    setSelectedMap(value);
    handleZoomToPrefecture(value?.name ?? "");
  };

  if (!commonBounds) return <div>Loading...</div>;

  return (
    <svg
      ref={svgRef}
      width={3000}
      height={3000}
      style={{
        border: "1px solid #ccc",
        width: "calc(100vw - 40px)",
        height: "calc(100vh - 20px)",
        display: "block",
      }}
    >
      <defs>
        <filter id="shadow">
          <feDropShadow
            dx="2"
            dy="2"
            stdDeviation="3"
            floodColor="#000"
            floodOpacity="0.7"
          />
        </filter>
      </defs>
      <g transform="translate(-900, -500)">
        {selectedMap == null ? (
          <g ref={gRef}>
            {wordData.map((group, gIdx) =>
              wordcloudDraw({
                bounds,
                group,
                geoFeatures,
                gIdx,
                selectedWord,
                hoveredPref,
                mode,
                onHover,
                onWordClick,
                handleWordClick,
                temperatureScale,
                precipitationScale,
                weatherData,
              })
            )}
            {wordcloudDraw({
              bounds,
              group: hoveredPref,
              geoFeatures,
              gIdx: 48,
              selectedWord,
              hoveredPref,
              mode,
              onHover,
              onWordClick,
              handleWordClick,
              temperatureScale,
              precipitationScale,
              weatherData,
            })}
          </g>
        ) : (
          <g ref={gRef}>
            <MunicipalityMap
              selectedWord={selectedWord}
              bounds={bounds}
              group={selectedMap}
              gIdx={48}
              hoverdPref={hoveredPref}
              onHover={onHover}
              onWordClick={onWordClick}
            />
          </g>
        )}
      </g>
    </svg>
  );
};

export default WordCloudCanvas;
