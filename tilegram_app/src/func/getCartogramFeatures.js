import cartogram from "cartogram-chart";
import * as d3 from "d3";
import { cartogram as topogramCartogram } from "topogram";
import { feature as topojsonFeature } from "topojson-client";
import { topology as topojsonTopology } from "topojson-server";

const resolveId = (props) => {
  const id =
    props?.pref || props?.name_ja || props?.name || props?.id || props?.code;
  return id;
};

const buildManualPath = (feat) => {
  const geom = feat && feat.geometry;
  if (!geom || !geom.coordinates) return null;
  const coordStr = (ring) => ring.map((p) => `${+p[0]},${+p[1]}`).join("L");
  try {
    if (geom.type === "Polygon") {
      const result = geom.coordinates
        .map((ring) => "M" + coordStr(ring) + "Z")
        .join(" ");
      return result;
    }
    if (geom.type === "MultiPolygon") {
      const result = geom.coordinates
        .map((poly) => poly.map((ring) => "M" + coordStr(ring) + "Z").join(" "))
        .join(" ");
      return result;
    }
    if (geom.type === "LineString") {
      const result = "M" + coordStr(geom.coordinates);
      return result;
    }
    if (geom.type === "Point") {
      const p = geom.coordinates;
      const result = `M${+p[0]},${+p[1]} l0,0`;
      return result;
    }
  } catch (e) {
    console.warn("[getCartogramFeatures] buildManualPath error", e);
  }
  return null;
};

const sampleCoord = (feat) => {
  const geom = feat && feat.geometry;
  if (!geom) return null;
  const dive = (coords) => {
    if (!coords) return null;
    if (typeof coords[0] === "number" && typeof coords[1] === "number")
      return coords;
    for (const c of coords) {
      const s = Array.isArray(c) ? dive(c) : null;
      if (s) return s;
    }
    return null;
  };
  const result = dive(geom.coordinates);
  return result;
};

const interp = (a, b, t) => {
  if (typeof a === "number" && typeof b === "number") {
    const v = a * (1 - t) + b * t;
    return v;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const arr = a.map((aa, i) => interp(aa, b[i], t));
    return arr;
  }
  return b;
};

/**
 * Produce the same GeoJSON FeatureCollection that "Export GeoJSON (lon/lat)" copies to the clipboard.
 */
export const getCartogramFeatures = async (geojson, data, options = {}) => {
  if (!geojson || !Array.isArray(geojson.features)) {
    throw new Error("Invalid geojson");
  }

  if (typeof document === "undefined") {
    throw new Error(
      "getCartogramFeatures requires a DOM (document) environment"
    );
  }

  const width = options.width || 1100;
  const height = options.height || 1100;
  const quantize = options.quantize || 1e5;
  const iterations = options.iterations || 60;
  const distortionBlend =
    options.distortionBlend === undefined ? 0.35 : options.distortionBlend;

  const projection = d3.geoMercator().fitSize([width, height], geojson);

  const topo = topojsonTopology({ prefectures: geojson }, quantize);

  // Determine value multiplier similarly to App.jsx
  let valueMultiplier = 1;
  let valueFn = (d) => {
    const id = resolveId(d.properties || d);
    const base = data[id] || 1;
    return Math.sqrt(base);
  };
  try {
    const mappedValues = topo.objects.prefectures.geometries.map((g) => {
      const id = resolveId(g.properties);
      return data[id] || 1;
    });
    const vMin = Math.min(...mappedValues);
    const vMax = Math.max(...mappedValues);
    const ratio = vMax / Math.max(1, vMin);
    if (ratio < 2) valueMultiplier = 4;
    else if (ratio < 10) valueMultiplier = 2;
    else if (ratio < 50) valueMultiplier = 1.5;
    else valueMultiplier = 1;
    valueFn = (d) => {
      const id = resolveId(d.properties || d);
      const base = data[id] || 1;
      return Math.sqrt(base) * valueMultiplier;
    };
  } catch (e) {
    console.warn("[getCartogramFeatures] valueMultiplier compute failed", e);
    // fallback keeps defaults
  }

  // Run cartogram-chart to mutate topology
  const container = document.createElement("div");
  const chart = cartogram()
    .projection(projection)
    .width(width)
    .height(height)
    .value(valueFn);

  chart(container, {
    topoJson: topo,
    topoObjectName: "prefectures",
    iterations,
    value: valueFn,
  });

  const makeRunner = (withProjection) => {
    const runner = topogramCartogram().properties((d) => d.properties);
    if (withProjection) runner.projection(projection);
    runner.value((d) => {
      const id = resolveId(d.properties || d);
      const v = (data[id] || 1) * valueMultiplier;
      return v;
    });
    return runner;
  };

  let distorted = makeRunner(true).iterations(iterations)(
    topo,
    topo.objects.prefectures.geometries
  ).features;

  const sample = sampleCoord(distorted && distorted[0]);
  const coordIsFinite = (c) =>
    c && Number.isFinite(c[0]) && Number.isFinite(c[1]);
  const coordIsGeographic = (c) =>
    coordIsFinite(c) &&
    c[0] >= -180 &&
    c[0] <= 180 &&
    c[1] >= -90 &&
    c[1] <= 90;

  let useProjectionForPath = true;
  if (!coordIsFinite(sample)) {
    const distortedNoProj = makeRunner(false).iterations(iterations)(
      topo,
      topo.objects.prefectures.geometries
    ).features;
    distorted = distortedNoProj;
    const sample2 = sampleCoord(distorted && distorted[0]);
    useProjectionForPath = coordIsGeographic(sample2);
  } else {
    useProjectionForPath = coordIsGeographic(sample);
  }

  const originalFeatures = (() => {
    try {
      return topojsonFeature(topo, topo.objects.prefectures).features;
    } catch {
      return null;
    }
  })();

  const pathGen = d3
    .geoPath()
    .projection(useProjectionForPath ? projection : null);

  const prepared = distorted.map((feat, i) => {
    let blendedFeat = feat;
    try {
      const orig = originalFeatures && originalFeatures[i];
      if (orig && orig.geometry && feat.geometry) {
        const blendedCoords = interp(
          orig.geometry.coordinates,
          feat.geometry.coordinates,
          distortionBlend
        );
        blendedFeat = {
          ...feat,
          geometry: {
            type: feat.geometry.type,
            coordinates: blendedCoords,
          },
        };
      }
    } catch {
      blendedFeat = feat;
    }

    let dStr = null;
    try {
      dStr = pathGen(blendedFeat);
    } catch {
      dStr = null;
    }
    if (!dStr) {
      dStr = buildManualPath(blendedFeat);
    }

    return { feat: blendedFeat, dStr };
  });

  const invertCoords = (coords, fallback) => {
    if (!Array.isArray(coords))
      return Array.isArray(fallback) ? fallback : coords;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      if (projection && projection.invert) {
        const p = projection.invert([coords[0], coords[1]]);
        if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) return p;
      }
      if (Array.isArray(fallback) && fallback.length >= 2) return fallback;
      return [coords[0], coords[1]];
    }
    return coords.map((c, idx) =>
      invertCoords(c, Array.isArray(fallback) ? fallback[idx] : undefined)
    );
  };

  const sanitizeCoords = (coords) => {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const x = Number.isFinite(coords[0]) ? coords[0] : 0;
      const y = Number.isFinite(coords[1]) ? coords[1] : 0;
      return [x, y];
    }
    return coords
      .map((c) => sanitizeCoords(c))
      .filter((c) => !(Array.isArray(c) && c.length === 0));
  };

  const features = prepared.map((p, idx) => {
    const feat = JSON.parse(JSON.stringify(p.feat));
    if (feat?.geometry?.coordinates) {
      const orig = originalFeatures && originalFeatures[idx];
      const fallbackCoords = orig?.geometry?.coordinates;
      const inverted = invertCoords(feat.geometry.coordinates, fallbackCoords);
      feat.geometry.coordinates = sanitizeCoords(inverted);
    }
    return feat;
  });

  const validFeatures = features.filter(
    (f) => f && f.geometry && Array.isArray(f.geometry.coordinates)
  );

  return { type: "FeatureCollection", features: validFeatures };
};
