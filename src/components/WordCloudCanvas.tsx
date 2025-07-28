import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import wordcloudDraw from "./WordCloudDraw";
import MunicipalityMap from "./MunicipalityMap";

interface CanvasWordCloudProps {
  wordData: any[];
  bounds: Record<string, any>; // bounds[prefCode].bbox = [x0, y0, x1, y1]
  selectedWord: string | null;
  onWordClick: (word: string) => void;
  mode: boolean;
}

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

  const [hoveredPref, setHoveredPref] = useState({});
  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<object | null>(null);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [temperatureScale, setTemperatureScale] = useState(null);
  const [precipitationScale, setPrecipitationScale] = useState(null);
  const commonBounds = bounds;

  // --- Hoverイベント ---
  const onHover = (value: object) => {
    setHoveredPref(value);
  };

  // --- JSONデータ読み込み ---
  useEffect(() => {
    fetch("/weather_by_prefecture.json")
      .then((res) => res.json())
      .then((raw) => {
        const cleaned = raw
          .filter(
            (d: any) => d.都道府県 && !isNaN(parseFloat(d.avg_temperature))
          )
          .map((d: any) => ({
            都道府県: d.都道府県,
            Yearly_precipitation: parseFloat(d["Yearly precipitation"]),
            avg_temperature: parseFloat(d["avg_temperature"]),
          }));
        // weatherData を { '東京都': { avg_temperature: ..., Yearly_precipitation: ... } } にする
        const cleanedDict = cleaned.reduce((acc, cur) => {
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
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
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
    const tx = width / 2 - scale * (x0 + prefWidth / 2);
    const ty = height / 2 - scale * (y0 + prefHeight / 2);

    svg
      .transition()
      .duration(750)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
  };

  // --- onWordClickとズーム処理を合わせるラッパー ---
  const handleWordClick = (value: object) => {
    setSelectedMap(value);
    handleZoomToPrefecture((value as any).name);
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
            bounds={bounds}
            group={selectedMap}
            geoFeatures={geoFeatures}
            gIdx={48}
            onHover={onHover}
            handleWordClick={handleWordClick}
          />
        </g>
      )}
    </svg>
  );
};

export default WordCloudCanvas;
