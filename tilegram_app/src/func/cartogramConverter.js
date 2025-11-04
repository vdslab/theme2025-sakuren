export const cartogramConverter = (prepared, projection) => {
  console.log("[cartogramConverter] called", {
    preparedCount: prepared.length,
    projection,
  });
  const invertCoords = (coords) => {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const p = projection.invert([coords[0], coords[1]]);
      const result = p ? [p[0], p[1]] : [NaN, NaN];
      // console.log("[cartogramConverter] invertCoords", { coords, result });
      return result;
    }
    return coords.map((c) => invertCoords(c));
  };
  const features = prepared.map((p, i) => {
    const feat = JSON.parse(JSON.stringify(p.feat));
    feat.geometry.coordinates = invertCoords(feat.geometry.coordinates);
    console.log("[cartogramConverter] processed feature", { i, feat });
    return feat;
  });
  console.log("[cartogramConverter] return", {
    featuresCount: features.length,
  });
  return features;
};
