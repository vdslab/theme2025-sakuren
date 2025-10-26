import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCartogramFeatures } from "./func/getCartogramFeatures";
import * as d3 from "d3";
import { calcHex } from "./func/calcHex";
import { getTiles } from "./func/getTiles";

const DEFAULT_SCALE = 1;
const DEFAULT_TRANSLATE = { x: 0, y: 0 };
const createDefaultTransform = () =>
  d3.zoomIdentity
    .scale(DEFAULT_SCALE)
    .translate(DEFAULT_TRANSLATE.x, DEFAULT_TRANSLATE.y);

const fetchData = async (path) => {
  console.log(`[fetchData] Fetching: ${path}`);
  try {
    const response = await fetch(path);
    const json = await response.json();
    console.log(`[fetchData] Success: ${path}`);
    return json;
  } catch (error) {
    console.error(`[fetchData] Error fetching ${path}:`, error);
  }
};

export const App = () => {
  const [geojson, setGeojson] = useState(null);
  const [population, setPopulation] = useState(null);
  const [cartogram, setCartogram] = useState(null);

  const { idealHexArea, tileEdge, tileSize, tileCounts } = useMemo(() => {
    if (!cartogram) return {};
    const metricPerTile = 1;
    const SumMetrics = Object.values(population || {}).reduce(
      (acc, val) => acc + val,
      0
    );
    const result = calcHex(cartogram.features, metricPerTile, SumMetrics);
    console.log("[App] calcHex result", result);
    return result;
  }, [cartogram, population]);

  const tiles = useMemo(() => {
    const t = getTiles(
      idealHexArea,
      tileEdge,
      tileSize,
      tileCounts,
      cartogram?.features
    );
    console.log("[App] getTiles result", t);
    return t;
  }, [idealHexArea, tileEdge, tileSize, tileCounts, cartogram?.features]);

  console.log("[App] tiles", tiles);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef(null);
  const transformRef = useRef(createDefaultTransform());

  // keep canvas sized to viewport
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => {
      const next = { width: window.innerWidth, height: window.innerHeight };
      console.log("[App] viewport size ->", next);
      setSize(next);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const getMaxPolygon = (polygons) => {
    let maxArea = -Infinity;
    let maxPolygon = null;
    polygons.forEach((polygon) => {
      try {
        const area = Math.abs(d3.polygonArea(polygon));
        if (area > maxArea) {
          maxArea = area;
          maxPolygon = polygon;
        }
      } catch {
        // ignore errors
      }
    });
    return maxPolygon;
  };

  useEffect(() => {
    const loadData = async () => {
      console.log("[App] start loading data");
      const geojsonData = await fetchData("/data/prefecture_old.geojson");
      console.log(geojsonData);
      const filteredGeojsonData = {
        type: geojsonData.type,
        features: geojsonData.features.map((feature) => ({
          type: feature.type,
          properties: feature.properties,
          geometry: {
            type: "Polygon",
            coordinates: [
              getMaxPolygon(
                feature.geometry.coordinates.length
                  ? Array.isArray(feature.geometry.coordinates[0][0])
                    ? feature.geometry.coordinates.map((p) => p[0])
                    : feature.geometry.coordinates
                  : []
              ),
            ],
          },
        })),
      };
      const populationData = await fetchData("/data/population.json");
      console.log(filteredGeojsonData);
      setGeojson(filteredGeojsonData);
      setPopulation(populationData);
      console.log("[App] data loaded", {
        geojsonFeatures: filteredGeojsonData?.features?.length,
        populationKeys: populationData ? Object.keys(populationData).length : 0,
      });
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!geojson || !population) return;
    console.log("[App] generating cartogram features");
    getCartogramFeatures(geojson, population).then((fc) => {
      console.log("[App] cartogram generated", {
        features: fc?.features?.length,
        sample: fc?.features?.[0],
      });
      setCartogram(fc);
    });
  }, [geojson, population]);

  const drawCartogram = useCallback(() => {
    const { width, height } = size;
    if (!cartogram || !canvasRef.current || !width || !height) {
      console.log(
        "[drawCartogram] Skipped: missing cartogram, canvas, or size",
        {
          cartogram: !!cartogram,
          canvas: !!canvasRef.current,
          width,
          height,
        }
      );
      return;
    }

    const canvas = canvasRef.current;
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.warn(
        "[drawCartogram] canvas ref is not a canvas element",
        canvas
      );
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[drawCartogram] failed to get 2D context");
      return;
    }

    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    const projection = d3.geoMercator().fitSize([width, height], cartogram);
    const path = d3.geoPath().projection(projection).context(ctx);

    ctx.save();
    const transform = transformRef.current || d3.zoomIdentity;
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    console.log("[drawCartogram] Drawing features", {
      featureCount: cartogram.features.length,
      transform,
    });
    cartogram.features.forEach((feature, i) => {
      ctx.beginPath();
      path(feature);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 0.5 / transform.k;
      ctx.stroke();
      if (i === 0) {
        console.log("[drawCartogram] Drew first feature", feature);
      }
    });
    ctx.restore();
    console.log("[drawCartogram] Finished drawing");
  }, [cartogram, size]);

  useEffect(() => {
    console.log("[App] useEffect(drawCartogram)");
    drawCartogram();
  }, [drawCartogram]);

  useEffect(() => {
    const { width, height } = size;
    if (!cartogram || !canvasRef.current || !width || !height) {
      console.log(
        "[App] useEffect(zoom) skipped: missing cartogram, canvas, or size"
      );
      return;
    }

    const canvas = canvasRef.current;
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.warn(
        "[App] useEffect(zoom): canvas ref is not a canvas element",
        canvas
      );
      return;
    }

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        console.log("[App] zoom event", event.transform);
        drawCartogram();
      });

    const selection = d3.select(canvas);
    const initialTransform = createDefaultTransform();
    transformRef.current = initialTransform;
    selection.call(zoom);
    selection.call(zoom.transform, initialTransform);
    selection.on("dblclick.zoom", null);

    console.log("[App] zoom initialized", { initialTransform });

    return () => {
      selection.on(".zoom", null);
      console.log("[App] zoom cleaned up");
    };
  }, [cartogram, size, drawCartogram]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
      id="canvas"
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
};
