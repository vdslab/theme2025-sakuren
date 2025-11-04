import { geoPath } from "d3-geo";

export const gridUnit = { width: 0.75, height: 1.0 };
export const TILE_OFFSET = 1;
const devicePixelRatio = window.devicePixelRatio;

const getTileEdgeFromGridUnit = ({ width, height }) => {
  return Math.min(width / Math.sqrt(3.0), (height / 3.0) * 2.0);
};

const getTileEdgeFromArea = (area) => {
  return Math.sqrt((area * 2) / (Math.sqrt(3) * 3));
};

export const calcHex = (features, metricPerTile, SumMetrics) => {
  const cartogramArea = features.reduce(
    (acc, feature) => acc + geoPath().area(feature),
    0
  );

  const idealHexArea = (cartogramArea * metricPerTile) / SumMetrics;
  // const tileEdge = getTileEdgeFromArea(idealHexArea);
  const tileEdge = 5;

  const tileSize = {
    width: Math.sqrt(3.0) * tileEdge,
    height: 2.0 * tileEdge,
  };
  const canvasContainer = document.getElementById("canvas");
  const canvasDimensions = {
    width: Math.max(200, canvasContainer.offsetWidth * devicePixelRatio),
    height: Math.max(200, canvasContainer.offsetHeight * devicePixelRatio),
  };

  const tileCounts = {
    width: Math.floor(
      canvasDimensions.width / (tileSize.width * gridUnit.width) -
        TILE_OFFSET * 2
    ),
    height: Math.floor(
      canvasDimensions.height / (tileSize.height * gridUnit.height) -
        TILE_OFFSET * 2
    ),
  };
  console.log(
    "[calcHex] tileEdge",
    tileEdge,
    "tileSize",
    tileSize,
    "canvasDimensions",
    canvasDimensions,
    "tileCounts",
    tileCounts,
    "idealHexArea",
    idealHexArea,
    "tileCounts",
    tileCounts
  );

  const result = { idealHexArea, tileEdge, tileSize, tileCounts };
  return result;
};
