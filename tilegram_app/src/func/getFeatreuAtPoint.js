import { area } from "d3";
import { geoPath } from "d3-geo";
import inside from "point-in-polygon";

const MIN_PATH_AREA = 0.5;

const normalizePointToFeatureSpace = (point, options = {}) => {
  const { projection, transform, devicePixelRatio: optionDpr } = options;
  const fallback = [point.x, point.y];

  if (!projection || typeof projection.invert !== "function") {
    return fallback;
  }

  const dpr =
    typeof optionDpr === "number" && optionDpr > 0
      ? optionDpr
      : typeof window !== "undefined" && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;

  let px = point.x;
  let py = point.y;

  if (transform) {
    const k = typeof transform.k === "number" ? transform.k : 1;
    const tx = typeof transform.x === "number" ? transform.x : 0;
    const ty = typeof transform.y === "number" ? transform.y : 0;
    px = (px - tx) / k;
    py = (py - ty) / k;
  }

  const cssX = px / dpr;
  const cssY = py / dpr;
  const inverted = projection.invert([cssX, cssY]);

  if (
    Array.isArray(inverted) &&
    Number.isFinite(inverted[0]) &&
    Number.isFinite(inverted[1])
  ) {
    return inverted;
  }

  return fallback;
};

const checkWithinBounds = (point, bounds) => {
  for (let lim = 0; lim < 2; lim++) {
    for (let dim = 0; dim < 2; dim++) {
      if (lim === 0 && point[dim] < bounds[lim][dim]) {
        return false;
      } else if (lim === 1 && point[dim] > bounds[lim][dim]) {
        return false;
      }
    }
  }
  return true;
};

const getGeneralBounds = (features) => {
  const pathProjection = geoPath();
  let generalBounds = [
    [Infinity, Infinity],
    [-Infinity, -Infinity],
  ];

  const projectedStates = features.map((feature) => {
    const hasMultiplePaths = feature.geometry.type === "MultiPolygon";
    const bounds = pathProjection.bounds(feature);
    for (let lim = 0; lim < 2; lim++) {
      for (let dim = 0; dim < 2; dim++) {
        generalBounds[lim][dim] = Math[lim === 0 ? "min" : "max"](
          generalBounds[lim][dim],
          bounds[lim][dim]
        );
      }
    }
    const paths = feature.geometry.coordinates
      .filter((path) => area(hasMultiplePaths ? path[0] : path) > MIN_PATH_AREA)
      .map((path) => [hasMultiplePaths ? path[0] : path]);
    return { bounds, paths };
  });

  return { generalBounds, projectedStates };
};

export const getFeatureAtPoint = (point, features, options = {}) => {
  const { generalBounds, projectedStates } = getGeneralBounds(features);
  const pointDimensions = normalizePointToFeatureSpace(point, options);

  // if (!checkWithinBounds(pointDimensions, generalBounds)) {
  //   return null;
  // }

  const found = features.find((feature, featureIndex) => {
    const bounds = projectedStates[featureIndex].bounds;
    // if (!checkWithinBounds(pointDimensions, bounds || generalBounds)) {
    //   return false;
    // }
    const matchingPath = projectedStates[featureIndex].paths.find((path) =>
      inside(pointDimensions, path[0])
    );
    return matchingPath != null;
  });
  if (found) {
    console.log("[getFeatureAtPoint] found feature", found);
  } else {
    // console.log("[getFeatureAtPoint] no feature found", { point });
  }
  return found;
};
