import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import wordcloudDraw from "./WordCloudDraw";
import MunicipalityMap from "./MunicipalityMap"

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
  const [selectedMap,setSelectedMap]=useState<object|null>(null)
  const commonBounds = bounds;
  console.log(selectedMap)

  // --- Hoverイベント ---
  const onHover = (value: object) => {
    setHoveredPref(value);
  };

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
  const handleWordClick = (value:object) => {
    setSelectedMap(value)
    handleZoomToPrefecture(value.name); // クリックでズーム
  };

  if (!commonBounds) return <div>Loading...</div>;

  return (
    <svg
      ref={svgRef}
      width={3000}          // 明示的な数値に変更
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
      {selectedMap==null?(
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
        })}
      </g>)
      :
      (
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
