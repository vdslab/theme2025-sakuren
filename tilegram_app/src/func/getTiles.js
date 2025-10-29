import { gridUnit, TILE_OFFSET } from "./calcHex";
import { getFeatureAtPoint } from "./getFeatreuAtPoint";

const calcCenter = (tileSize, x, y) => {
  const center = {
    x:
      tileSize.width *
      ((x + TILE_OFFSET) * gridUnit.width + (y % 2 === 0 ? 0.5 : 0)),
    y: tileSize.height * ((y + TILE_OFFSET) * gridUnit.height),
  };
  // console.log("[getTiles] calcCenter", { x, y, center });
  return center;
};

export const getTiles = (
  idealHexArea,
  tileEdge,
  tileSize,
  tileCounts,
  features,
  options = {}
) => {
  console.log("[getTiles] called", {
    idealHexArea,
    tileEdge,
    tileSize,
    tileCounts,
    featuresCount: features?.length,
  });
  if (!idealHexArea || !tileEdge || !tileSize || !tileCounts || !features) {
    console.log("[getTiles] missing inputs");
    return [];
  }
  const tiles = [];
  console.log("[getTiles] tileCounts", tileCounts);
  for (let x = TILE_OFFSET - 2; x < tileCounts.width + 3; x++) {
    console.log("[getTiles] processing column", { x });
    for (let y = TILE_OFFSET - 2; y < tileCounts.height + 3; y++) {
      const center = calcCenter(tileSize, x, y);
      const feature = getFeatureAtPoint(center, features, options);
      if (feature) {
        const tile = {
          id: feature.id,
          position: { x, y },
        };
        tiles.push(tile);
      }
    }
  }
  console.log("[getTiles] fin", tiles);
  return tiles;
};
