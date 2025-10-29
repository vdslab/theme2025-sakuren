import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcHex, gridUnit } from "./func/calcHex";

import * as d3 from "d3";
import { buildHexBackgroundCanvas } from "./func/buildHexBackgroundCanvas";
import { getCartogramFeatures } from "./func/getCartogramFeatures";

const fetchData = async (path) => {
  try {
    const response = await fetch(path);
    const json = await response.json();
    console.log(`[fetchData] Success: ${path}`);
    return json;
  } catch (error) {
    console.error(`[fetchData] Error fetching ${path}:`, error);
  }
};

const DEFAULT_SCALE = 1;
const DEFAULT_TRANSLATE = { x: 0, y: 0 };
const createDefaultTransform = () =>
  d3.zoomIdentity
    .scale(DEFAULT_SCALE)
    .translate(DEFAULT_TRANSLATE.x, DEFAULT_TRANSLATE.y);

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

export const TilegramApp = () => {
  const canvasRef = useRef(null);
  const transformRef = useRef(createDefaultTransform());
  const backgroundCanvasRef = useRef(null);

  const [geojson, setGeojson] = useState(null);
  const [population, setPopulation] = useState(null);
  const [cartogram, setCartogram] = useState(null);

  const [size, setSize] = useState({ width: 0, height: 0 });

  const tileProjection = useMemo(() => {
    if (!cartogram || !size.width || !size.height) return null;
    try {
      return d3.geoMercator().fitSize([size.width, size.height], cartogram);
    } catch (error) {
      console.warn("[App] failed to build tile projection", error);
      return null;
    }
  }, [cartogram, size.width, size.height]);

  const { idealHexArea, tileEdge, tileSize, tileCounts } = useMemo(() => {
    if (!cartogram) return {};
    const metricPerTile = 1;
    const SumMetrics = Object.values(population || {}).reduce(
      (acc, val) => acc + val,
      0
    );
    const result = calcHex(cartogram.features, metricPerTile, SumMetrics);
    return result;
  }, [cartogram, population]);

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

  useEffect(() => {
    const loadData = async () => {
      const geojsonData = await fetchData("/data/prefecture_old.geojson");
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
      setGeojson(filteredGeojsonData);
      setPopulation(populationData);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!geojson || !population) return;
    getCartogramFeatures(geojson, population).then((fc) => {
      setCartogram(fc);
    });
  }, [geojson, population]);

  const drawCartogram = useCallback(() => {
    const { width, height } = size;
    if (!canvasRef.current || !width || !height) {
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

    const transform = transformRef.current || d3.zoomIdentity;
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const background = backgroundCanvasRef.current;
    if (background) {
      const logicalWidth = background.width / dpr;
      const logicalHeight = background.height / dpr;
      ctx.drawImage(
        background,
        0,
        0,
        background.width,
        background.height,
        0,
        0,
        logicalWidth,
        logicalHeight
      );
    }

    if (!cartogram) {
      ctx.restore();
      return;
    }

    const projection = d3.geoMercator().fitSize([width, height], cartogram);
    const path = d3.geoPath().projection(projection).context(ctx);

    cartogram.features.forEach((feature) => {
      ctx.beginPath();
      path(feature);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 0.5 / transform.k;
      ctx.stroke();
    });
    ctx.restore();
  }, [cartogram, size]);

  useEffect(() => {
    if (!tileEdge || !size.width || !size.height) return;

    const { width, height } = size;
    const dpr = window.devicePixelRatio || 1;
    const off = buildHexBackgroundCanvas(width * dpr, height * dpr, tileEdge, {
      tileCounts,
      gridUnit,
    });
    backgroundCanvasRef.current = off;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, width, height);
    if (cartogram) {
      drawCartogram();
    }
  }, [tileEdge, tileCounts, size, cartogram, drawCartogram]);

  useEffect(() => {
    if (!geojson || !population) return;
    getCartogramFeatures(geojson, population).then((fc) => {
      setCartogram(fc);
    });
  }, [geojson, population]);

  useEffect(() => {
    drawCartogram();
  }, [drawCartogram]);

  useEffect(() => {
    const { width, height } = size;
    if (!cartogram || !canvasRef.current || !width || !height) {
      return;
    }

    const canvas = canvasRef.current;
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        drawCartogram();
      });

    const selection = d3.select(canvas);
    const initialTransform = createDefaultTransform();
    transformRef.current = initialTransform;
    selection.call(zoom);
    selection.call(zoom.transform, initialTransform);
    selection.on("dblclick.zoom", null);

    return () => {
      selection.on(".zoom", null);
    };
  }, [cartogram, size, drawCartogram]);

  // const tiles = useMemo(() => {
  //   if (!cartogram?.features || !tileProjection) return [];
  //   const t = getTiles(
  //     idealHexArea,
  //     tileEdge,
  //     tileSize,
  //     tileCounts,
  //     cartogram.features,
  //     {
  //       projection: tileProjection,
  //       transform: transformRef.current,
  //       devicePixelRatio:
  //         typeof window !== "undefined" && window.devicePixelRatio
  //           ? window.devicePixelRatio
  //           : 1,
  //     }
  //   );
  //   console.log("[App] getTiles result", t);
  //   return t;
  // }, [
  //   cartogram?.features,
  //   idealHexArea,
  //   tileCounts,
  //   tileEdge,
  //   tileProjection,
  //   tileSize,
  // ]);

  // useEffect(() => {
  //   console.log("[App] tiles", tiles);
  // }, [tiles]);

  return (
    <canvas
      id="canvas"
      ref={canvasRef}
      width={size.width}
      height={size.height}
    />
  );
};
