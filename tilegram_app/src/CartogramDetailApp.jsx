import cartogram from "cartogram-chart";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { cartogram as topogramCartogram } from "topogram";
import { feature as topojsonFeature } from "topojson-client";
import { topology as topojsonTopology } from "topojson-server";

const fetchData = async (path) => {
  console.log(`[CartogramApp] fetchData: ${path}`);
  try {
    const response = await fetch(path);
    const json = await response.json();
    console.log(`[CartogramApp] fetchData success: ${path}`);
    return json;
  } catch (error) {
    console.error(`[CartogramApp] fetchData error: ${path}`, error);
  }
};
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
export const CartogramApp = () => {
  const [i, setI] = useState(1);
  const [geojson, setGeojson] = useState(null);
  const [population, setPopulation] = useState(null);
  const svgRef = useRef(null);
  const prefectureMap = {
    1: "北海道",
    2: "青森県",
    3: "岩手県",
    4: "宮城県",
    5: "秋田県",
    6: "山形県",
    7: "福島県",
    8: "茨城県",
    9: "栃木県",
    10: "群馬県",
    11: "埼玉県",
    12: "千葉県",
    13: "東京都",
    14: "神奈川県",
    15: "新潟県",
    16: "富山県",
    17: "石川県",
    18: "福井県",
    19: "山梨県",
    20: "長野県",
    21: "岐阜県",
    22: "静岡県",
    23: "愛知県",
    24: "三重県",
    25: "滋賀県",
    26: "京都府",
    27: "大阪府",
    28: "兵庫県",
    29: "奈良県",
    30: "和歌山県",
    31: "鳥取県",
    32: "島根県",
    33: "岡山県",
    34: "広島県",
    35: "山口県",
    36: "徳島県",
    37: "香川県",
    38: "愛媛県",
    39: "高知県",
    40: "福岡県",
    41: "佐賀県",
    42: "長崎県",
    43: "熊本県",
    44: "大分県",
    45: "宮崎県",
    46: "鹿児島県",
    47: "沖縄県",
  };
  useEffect(() => {
    const prefName = prefectureMap[i];
    const loadData = async () => {
      const populationData = await fetchData("/data/population_detail.json");
      const popData =
        populationData.find((f) => f.N001 === prefName)?.data || {};
      const geojsonData = await fetchData("/data/N03-21_210101.json");
      const filteredGeojsonData = {
        type: geojsonData.type,
        features: geojsonData.features
          .filter(
            (f) =>
              f.properties.N03_001 === prefName &&
              (popData[f.properties.N03_003] != undefined ||
                popData[f.properties.N03_004] != undefined)
          )
          .map((feature) => {
            const geom = feature.geometry;
            if (!geom || !geom.coordinates || geom.coordinates.length === 0)
              return null;

            // Polygon の場合
            if (geom.type === "Polygon") {
              if (
                geom.coordinates[0] != null &&
                geom.coordinates[0].length > 0
              ) {
                return feature;
              } else {
                // coordinates[0] が null または空なら除外
                return null;
              }
            }

            // MultiPolygon の場合 → 面積最大の Polygon に変換
            if (geom.type === "MultiPolygon") {
              const maxPoly = getMaxPolygon(geom.coordinates);
              if (!maxPoly) return null; // nullなら除外
              return {
                type: feature.type,
                properties: feature.properties,
                geometry: {
                  type: "Polygon",
                  coordinates: [maxPoly],
                },
              };
            }

            return null; // Polygon/MultiPolygon 以外は捨てる
          })
          .filter(Boolean), // null を除外
      };

      setGeojson(filteredGeojsonData);
      setPopulation(popData);
    };
    loadData();
  }, [i]);

  // return <>テスト</>;

  useEffect(() => {
    if (!geojson || !population || !svgRef.current) return;
    console.log("[CartogramApp] start render", { geojson, population });

    const container = d3.select(svgRef.current);
    container.selectAll("*").remove();

    const width = 1100;
    const height = 1100;
    const projection = d3.geoMercator().fitSize([width, height], geojson);
    window._projection = projection;
    const values = Object.values(population);
    const color = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([d3.min(values), d3.max(values)]);

    const chart = cartogram()
      .projection(projection)
      .width(width)
      .height(height)
      .value((d) => {
        const name =
          d.properties.N03_003?.endsWith("市") ||
          d.properties.N03_003?.endsWith("郡")
            ? d.properties.N03_003
            : d.properties.N03_004;
        return population[name] || 1;
      });
    console.log(geojson);
    const topo = topojsonTopology({ prefectures: geojson }, 1e5);
    console.log("topo.objects:", Object.keys(topo.objects));
    console.log(
      "geometries count:",
      topo.objects.prefectures.geometries.length
    );
    console.log("first geometry:", topo.objects.prefectures.geometries[0]);
    let valueMultiplier = 1;
    let valueFn = (d) => {
      const name =
        d.properties.N03_003?.endsWith("市") ||
        d.properties.N03_003?.endsWith("郡")
          ? d.properties.N03_003
          : d.properties.N03_004;
      return population[name] || 1;
    };
    try {
      const mappedValues = topo.objects.prefectures.geometries.map((g) => {
        const name =
          g.properties?.name_ja || g.properties?.name || g.properties?.pref;
        return population[name] || 1;
      });
      const vMin = Math.min(...mappedValues);
      const vMax = Math.max(...mappedValues);
      const ratio = vMax / Math.max(1, vMin);
      if (ratio < 2) valueMultiplier = 4;
      else if (ratio < 10) valueMultiplier = 2;
      else if (ratio < 50) valueMultiplier = 1.5;
      else valueMultiplier = 1;
      valueFn = (d) => {
        const name =
          d.properties?.name_ja || d.properties?.name || d.properties?.pref;
        return Math.sqrt(population[name] || 1) * valueMultiplier;
      };
      console.log("[CartogramApp] valueMultiplier", {
        vMin,
        vMax,
        ratio,
        valueMultiplier,
      });
    } catch (e) {
      console.warn("[CartogramApp] valueMultiplier compute failed", e);
    }

    const topoIterations = 60;
    console.log("[CartogramApp] chart rendering", { topoIterations });
    console.log(container.node());
    chart(container.node(), {
      topoJson: topo,
      topoObjectName: "prefectures",
      iterations: topoIterations,
      value: valueFn,
    });

    const waitForSvgAndRender = () => {
      const svgNode = container.node().querySelector("svg");
      if (!svgNode) return false;

      try {
        const makeRunner = (withProjection) => {
          const r = topogramCartogram().properties((d) => d.properties);
          if (withProjection) r.projection(projection);
          r.value((d) => {
            const name =
              d.properties?.name_ja || d.properties?.name || d.properties?.pref;
            return (population[name] || 1) * valueMultiplier;
          });
          return r;
        };

        const runnerWithProj = makeRunner(true);
        let distorted = runnerWithProj.iterations(topoIterations)(
          topo,
          topo.objects.prefectures.geometries
        ).features;
        window._topogramFeatures = distorted;
        console.log("[CartogramApp] topogram run (with projection)", {
          features: distorted.length,
        });

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
          return dive(geom.coordinates);
        };

        const coordSample = sampleCoord(distorted[0]);
        const coordIsFinite = (c) =>
          c && Number.isFinite(c[0]) && Number.isFinite(c[1]);
        const coordIsGeographic = (c) =>
          coordIsFinite(c) &&
          c[0] >= -180 &&
          c[0] <= 180 &&
          c[1] >= -90 &&
          c[1] <= 90;

        let useProjectionForPath = true;
        if (!coordSample || !coordIsFinite(coordSample)) {
          console.warn(
            "[CartogramApp] topogram produced non-finite sample coords, retrying without projection",
            coordSample
          );
          const runnerNoProj = makeRunner(false);
          const distortedNoProj = runnerNoProj.iterations(topoIterations)(
            topo,
            topo.objects.prefectures.geometries
          ).features;
          window._topogramFeatures = distortedNoProj;
          distorted = distortedNoProj;
          const sample2 = sampleCoord(distorted[0]);
          if (sample2 && coordIsGeographic(sample2)) {
            useProjectionForPath = true;
          } else {
            useProjectionForPath = false;
          }
        } else {
          useProjectionForPath = coordIsGeographic(coordSample);
        }
        console.log(
          "[CartogramApp] useProjectionForPath",
          useProjectionForPath
        );

        const containerNode = container.node();
        if (!containerNode.style.position)
          containerNode.style.position = "relative";
        d3.select(containerNode).selectAll("svg.overlay").remove();
        const overlay = d3
          .select(containerNode)
          .append("svg")
          .attr("class", "overlay")
          .attr("width", width)
          .attr("height", height)
          .style("position", "absolute")
          .style("top", "0px")
          .style("left", "0px")
          .style("pointer-events", "none")
          .style("overflow", "visible");

        const svgSel = overlay;
        const pathGen = d3
          .geoPath()
          .projection(useProjectionForPath ? projection : null);

        const buildManualPath = (feat) => {
          const geom = feat && feat.geometry;
          if (!geom || !geom.coordinates) return null;
          const coordStr = (ring) =>
            ring.map((p) => `${+p[0]},${+p[1]}`).join("L");
          try {
            if (geom.type === "Polygon") {
              return geom.coordinates
                .map((ring) => "M" + coordStr(ring) + "Z")
                .join(" ");
            }
            if (geom.type === "MultiPolygon") {
              return geom.coordinates
                .map((poly) =>
                  poly.map((ring) => "M" + coordStr(ring) + "Z").join(" ")
                )
                .join(" ");
            }
            if (geom.type === "LineString") {
              return "M" + coordStr(geom.coordinates);
            }
            if (geom.type === "Point") {
              const p = geom.coordinates;
              return `M${+p[0]},${+p[1]} l0,0`;
            }
          } catch {
            console.warn("[CartogramApp] manual path build failed");
          }
          return null;
        };

        const originalFeatures = (() => {
          try {
            return topojsonFeature(topo, topo.objects.prefectures).features;
          } catch {
            return null;
          }
        })();

        const distortionBlend = 0.35;
        const interp = (a, b, t) => {
          if (typeof a === "number" && typeof b === "number")
            return a * (1 - t) + b * t;
          if (Array.isArray(a) && Array.isArray(b))
            return a.map((aa, i) => interp(aa, b[i], t));
          return b;
        };

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
              blendedFeat = Object.assign({}, feat, {
                geometry: {
                  type: feat.geometry.type,
                  coordinates: blendedCoords,
                },
              });
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

        window._prepared = prepared;
        console.log("[CartogramApp] prepared features", {
          count: prepared.length,
        });

        const valid = prepared.filter((p) => p.dStr != null && p.dStr !== "");
        if (valid.length > 0) {
          const group = svgSel.append("g").attr("class", "direct-distortion");
          const sel = group
            .selectAll("path")
            .data(valid)
            .enter()
            .append("path");
          sel
            .attr("d", (d) => d.dStr)
            .attr("fill", (d) => {
              const name =
                d.feat.properties?.name_ja ||
                d.feat.properties?.name ||
                d.feat.properties?.pref;
              return color(population[name]);
            })
            .attr("stroke", "#000")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.9);
        }
      } catch (e) {
        console.warn(
          "[CartogramApp] direct render of distorted features failed",
          e
        );
      }

      return true;
    };

    let attempts = 0;
    const iv = setInterval(() => {
      attempts += 1;
      const done = waitForSvgAndRender();
      if (done || attempts > 30) clearInterval(iv);
    }, 100);

    setTimeout(() => {
      try {
        const svgNode = container.node().querySelector("svg");
        const count = svgNode
          ? svgNode.querySelectorAll("path.feature").length
          : 0;
        window._pathCount = count;
        console.log("[CartogramApp] path count", count);
      } catch (e) {
        console.warn("[CartogramApp] path count check failed", e);
      }
    }, 1200);

    const svg = container.select("svg");
    svg
      .selectAll("path")
      .attr("fill", (event, d) => {
        const feature = d || event;
        const name =
          feature.properties?.name_ja ||
          feature.properties?.name ||
          feature.properties?.pref;
        return color(population[name]);
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5)
      .each(function (event, d) {
        const feature = d || event;
        const name =
          feature.properties?.name_ja ||
          feature.properties?.name ||
          feature.properties?.pref;
        const pop = population[name];
        d3.select(this).selectAll("title").remove();
        d3.select(this)
          .append("title")
          .text(`${name}: ${pop?.toLocaleString() || "N/A"}`);
      });
    console.log("[CartogramApp] render finished", prefectureMap[i]);
  }, [geojson, population]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>日本の人口カルトグラム</h2>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => {
            try {
              console.log("[CartogramApp] Export projected GeoJSON clicked");
              const feats = window._prepared || window._topogramFeatures;
              if (!feats || !Array.isArray(feats) || feats.length === 0) {
                alert(
                  "まだ歪みデータがありません。ページを少し待ってから再試行してください。"
                );
                return;
              }
              const features =
                feats[0] && feats[0].type === "Feature"
                  ? feats
                  : feats[0] && feats[0].feat
                  ? feats.map((p) => p.feat)
                  : feats;
              const fc = { type: "FeatureCollection", features };
              const text = JSON.stringify(fc);
              const blob = new Blob([text], { type: "application/geo+json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "cartogram_projected.geojson";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).catch(() => {});
              }
              alert("表示中の（投影済み）GeoJSON をダウンロードしました。");
              console.log("[CartogramApp] Export projected GeoJSON finished");
            } catch (e) {
              console.warn("[CartogramApp] Export projected GeoJSON failed", e);
              alert(
                "GeoJSON の生成に失敗しました。コンソールを確認してください。"
              );
            }
          }}
        >
          Export displayed GeoJSON (projected coordinates)
        </button>
        <button
          style={{ marginLeft: 8 }}
          onClick={() => {
            try {
              console.log("[CartogramApp] Export lon/lat GeoJSON clicked");
              const prepared = window._prepared;
              if (
                !prepared ||
                !Array.isArray(prepared) ||
                prepared.length === 0
              ) {
                alert(
                  "表示フィーチャ（prepared）がまだありません。少し待ってから再試行してください。"
                );
                return;
              }
              const projection = window._projection;
              if (!projection || !projection.invert) {
                alert(
                  "逆投影が利用できません。ページをリロードしてから再試行するか、投影のサポートを確認してください。"
                );
                return;
              }
              const invertCoords = (coords) => {
                if (!Array.isArray(coords)) return coords;
                if (
                  typeof coords[0] === "number" &&
                  typeof coords[1] === "number"
                ) {
                  const p = projection.invert([coords[0], coords[1]]);
                  return p ? [p[0], p[1]] : [NaN, NaN];
                }
                return coords.map((c) => invertCoords(c));
              };
              const features = prepared.map((p) => {
                const feat = JSON.parse(JSON.stringify(p.feat));
                feat.geometry.coordinates = invertCoords(
                  feat.geometry.coordinates
                );
                return feat;
              });
              const fc = { type: "FeatureCollection", features };
              const text = JSON.stringify(fc);
              const blob = new Blob([text], { type: "application/geo+json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "cartogram_lonlat.geojson";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              if (navigator.clipboard && navigator.clipboard.writeText)
                navigator.clipboard.writeText(text).catch(() => {});
              alert("逆投影した GeoJSON (lon/lat) をダウンロードしました。");
              console.log("[CartogramApp] Export lon/lat GeoJSON finished");
            } catch (e) {
              console.warn("[CartogramApp] Export lon/lat GeoJSON failed", e);
              alert(
                "逆投影エクスポートに失敗しました。コンソールを確認してください。"
              );
            }
            setI(i + 1);
          }}
        >
          Export GeoJSON (lon/lat)
        </button>
      </div>
      {!geojson || !population ? <div>Loading...</div> : <div ref={svgRef} />}
    </div>
  );
};
