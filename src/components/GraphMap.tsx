import * as d3 from "d3";
import * as d3geo from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart } from "./chart/PieChart";

type PrefectureFeatureProperties = {
  prefecture?: string;
  name?: string;
};

type WordcloudLayoutItem = {
  name: string;
  data: {
    word: string;
    count: number;
    color?: string;
  }[];
};

const PIE_TOP_WORDS = 5;
const PIE_MAX_SIZE = 64;
const PIE_MIN_SIZE = 18;

// 都道府県ごとの手動オフセット（「県形状が円グラフで隠れる」を避ける）
// 必要に応じて調整
const PIE_POSITION_OFFSETS: Record<string, { dx: number; dy: number }> = {
  沖縄県: { dx: 55, dy: 0 },
};

const hashToUnit = (s: string) => {
  // 安定したハッシュ（0..1）: 同じ単語は常に同じ色
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

const getWordColor = (word: string) => {
  // HSL色空間でhueをハッシュ値から均等分散（0-360度）
  // saturation/lightnessを固定して鮮やかさを保つ
  const hue = hashToUnit(word) * 360;
  return `hsl(${hue}, 70%, 50%)`;
};

const keepLargestPolygon = <P,>(
  feature: GeoJSON.Feature<GeoJSON.Geometry, P>
): GeoJSON.Feature<GeoJSON.Geometry, P> => {
  const geometry = feature.geometry;
  if (!geometry) return feature;

  if (geometry.type === "Polygon") return feature;

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates;
    if (polygons.length <= 1) return feature;

    let maxArea = -Infinity;
    let maxCoordinates: GeoJSON.Position[][] | null = null;

    for (const polygonCoords of polygons) {
      const polygon: GeoJSON.Polygon = {
        type: "Polygon",
        coordinates: polygonCoords,
      };
      const area = d3geo.geoArea(polygon);
      if (area > maxArea) {
        maxArea = area;
        maxCoordinates = polygonCoords;
      }
    }

    if (!maxCoordinates) return feature;

    return {
      ...feature,
      geometry: {
        type: "Polygon",
        coordinates: maxCoordinates,
      },
    };
  }

  return feature;
};

export const GraphMap = () => {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection<
    GeoJSON.Geometry,
    PrefectureFeatureProperties
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wordcloudLayout, setWordcloudLayout] = useState<
    WordcloudLayoutItem[] | null
  >(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // 初期位置はここを手動で調整する（x,y: 平行移動 / k: 拡大倍率）
  // 例: d3.zoomIdentity.translate(-200, -100).scale(1.2)
  const initialTransform = useMemo(
    () => d3.zoomIdentity.translate(-564.41, -9.47).scale(1.3159),
    []
  );

  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch("/prefectures.geojson")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to load GeoJSON: ${res.status} ${res.statusText}`
          );
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setGeojson(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load GeoJSON"
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/wordcloud_layout.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to load wordcloud layout: ${res.status} ${res.statusText}`
          );
        }
        return res.json();
      })
      .then((data: WordcloudLayoutItem[]) => {
        if (cancelled) return;
        setWordcloudLayout(data);
      })
      .catch((err) => {
        // 地図自体は表示できるので、ここでは致命的エラーにしない
        console.error("wordcloud_layout.json load error:", err);
        if (cancelled) return;
        setWordcloudLayout(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 画面サイズに追従（地図全体が常に収まるように projection を再計算する）
  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filteredGeojson = useMemo(() => {
    if (!geojson) return null;
    return {
      type: "FeatureCollection",
      features: geojson.features.map((f) => keepLargestPolygon(f)),
    } satisfies GeoJSON.FeatureCollection<
      GeoJSON.Geometry,
      PrefectureFeatureProperties
    >;
  }, [geojson]);

  const wordcloudByPrefName = useMemo(() => {
    const m = new Map<string, WordcloudLayoutItem>();
    if (!wordcloudLayout) return m;
    for (const item of wordcloudLayout) {
      if (item?.name) m.set(item.name, item);
    }
    return m;
  }, [wordcloudLayout]);

  const pathGenerator = useMemo(() => {
    if (!filteredGeojson) return null;
    if (!size.width || !size.height) return null;

    const padding = 16;
    const projection = d3geo.geoMercator().fitExtent(
      [
        [padding, padding],
        [
          Math.max(padding + 1, size.width - padding),
          Math.max(padding + 1, size.height - padding),
        ],
      ],
      filteredGeojson
    );
    return d3.geoPath().projection(projection);
  }, [filteredGeojson, size.height, size.width]);

  const pieOverlay = useMemo(() => {
    if (!filteredGeojson || !pathGenerator) return null;

    const items = filteredGeojson.features
      .map((feature, idx) => {
        const name =
          feature.properties?.prefecture ?? feature.properties?.name ?? "";
        const [cx, cy] = pathGenerator.centroid(feature);
        const wordItem = name ? wordcloudByPrefName.get(name) : null;

        const topWords = (wordItem?.data ?? [])
          .filter((d) => Number.isFinite(d.count) && d.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, PIE_TOP_WORDS);

        const pieData = topWords.map((d) => ({
          label: d.word,
          value: d.count,
          color: getWordColor(d.word),
        }));

        return { idx, name, feature, cx, cy, pieData };
      })
      .filter(
        (d) =>
          d.pieData.length > 0 && Number.isFinite(d.cx) && Number.isFinite(d.cy)
      );

    // 重なり回避: 最近傍距離から pie サイズを計算
    const withSize = items.map((a) => {
      let nearest = Infinity;
      for (const b of items) {
        if (a === b) continue;
        const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
        if (dist < nearest) nearest = dist;
      }
      const safe = Number.isFinite(nearest) ? nearest : PIE_MAX_SIZE;
      const pieSize = Math.max(
        PIE_MIN_SIZE,
        Math.min(PIE_MAX_SIZE, safe * 0.85)
      );
      return { ...a, pieSize };
    });

    // 円グラフ同士の重なり回避: d3-force で衝突解消（重心から大きく離れないように復元力も付与）
    type Node = {
      id: string;
      idx: number;
      name: string;
      x: number;
      y: number;
      x0: number;
      y0: number;
      r: number;
      pieSize: number;
      pieData: { label: string; value: number; color: string }[];
    };

    const nodes: Node[] = withSize.map((it) => {
      const r = it.pieSize / 2;

      const off = PIE_POSITION_OFFSETS[it.name] ?? { dx: 0, dy: 0 };
      const x0 = it.cx + off.dx;
      const y0 = it.cy + off.dy;
      return {
        id: `${it.name || ""}-${it.idx}`,
        idx: it.idx,
        name: it.name,
        x: x0,
        y: y0,
        x0,
        y0,
        r,
        pieSize: it.pieSize,
        pieData: it.pieData,
      };
    });

    if (nodes.length > 1) {
      const sim = d3
        .forceSimulation(nodes)
        .force("x", d3.forceX<Node>((n) => n.x0).strength(0.25))
        .force("y", d3.forceY<Node>((n) => n.y0).strength(0.25))
        .force("collide", d3.forceCollide<Node>((n) => n.r + 2).iterations(2))
        .stop();

      // 反復回数は描画負荷と衝突解消のバランス
      for (let i = 0; i < 140; i += 1) sim.tick();

      // 画面外へ出ないよう軽くクランプ
      for (const n of nodes) {
        const r = n.r;
        n.x = Math.min(Math.max(n.x, r), Math.max(r, size.width - r));
        n.y = Math.min(Math.max(n.y, r), Math.max(r, size.height - r));
      }
    }

    const itemsWithLayout = nodes
      .sort((a, b) => a.idx - b.idx)
      .map((n) => ({
        idx: n.idx,
        name: n.name,
        cx: n.x,
        cy: n.y,
        pieData: n.pieData,
        pieSize: n.pieSize,
      }));

    // 凡例（全国共通）: 実際に使った単語のみ（上位5件×都道府県の集合）
    const totals = new Map<string, number>();
    const occurrences = new Map<string, number>();
    for (const it of withSize) {
      const seen = new Set<string>();
      for (const p of it.pieData) {
        totals.set(p.label, (totals.get(p.label) ?? 0) + p.value);
        seen.add(p.label);
      }
      for (const w of seen) {
        occurrences.set(w, (occurrences.get(w) ?? 0) + 1);
      }
    }

    const legend = Array.from(totals.entries())
      .map(([word, total]) => ({
        word,
        total,
        occurrences: occurrences.get(word) ?? 0,
        color: getWordColor(word),
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.occurrences !== a.occurrences)
          return b.occurrences - a.occurrences;
        return a.word.localeCompare(b.word, "ja");
      });

    return { items: itemsWithLayout, legend };
  }, [
    filteredGeojson,
    pathGenerator,
    size.height,
    size.width,
    wordcloudByPrefName,
  ]);

  // ズーム/パン（WordCloudCanvas と同じ d3.zoom の方式）
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const g = d3.select<SVGGElement, unknown>(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 30])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // 初期位置を適用（現在の変換が identity のままなら初期値へ）
    if (
      transformRef.current.x === 0 &&
      transformRef.current.y === 0 &&
      transformRef.current.k === 1
    ) {
      transformRef.current = initialTransform;
    }
    zoom.transform(svg, transformRef.current);

    return () => {
      svg.on(".zoom", null);
    };
  }, [initialTransform, size.height, size.width]);

  const viewBox = `0 0 ${size.width || 1} ${size.height || 1}`;
  const isReady = Boolean(filteredGeojson && pathGenerator && pieOverlay);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#fff",
      }}
    >
      {loadError ? <div style={{ padding: 16 }}>{loadError}</div> : null}
      {!loadError && (!filteredGeojson || !pathGenerator) ? (
        <div style={{ padding: 16 }}>Loading...</div>
      ) : null}

      {isReady && pieOverlay?.legend?.length ? (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 20,
            background: "rgba(255,255,255,0.95)",
            border: "1px solid #ccc",
            padding: 10,
            fontSize: 12,
            lineHeight: 1.4,
            maxWidth: 260,
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>凡例</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            {pieOverlay.legend.map((item) => (
              <div
                key={item.word}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
                title={`${item.word}: 出現${
                  item.occurrences
                } / 合計${item.total.toLocaleString()}`}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: item.color,
                    border: "1px solid #999",
                    display: "inline-block",
                  }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.word}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={viewBox}
        width={size.width || 1}
        height={size.height || 1}
        preserveAspectRatio="xMidYMid meet"
        style={{
          border: "1px solid #ccc",
          width: "100%",
          height: "100%",
          display: "block",
          background: "#fff",
        }}
        role="img"
        aria-label="prefecture map"
      >
        <rect
          x={0}
          y={0}
          width={size.width || 1}
          height={size.height || 1}
          fill="#fff"
        />
        <g ref={gRef}>
          {isReady ? (
            <>
              {/* Layer 1: 都道府県ポリゴン（先に描く） */}
              <g>
                {filteredGeojson!.features.map((feature, idx) => {
                  const name =
                    feature.properties?.prefecture ??
                    feature.properties?.name ??
                    "";
                  return (
                    <path
                      key={name || idx}
                      d={pathGenerator!(feature) ?? ""}
                      fill="#d8f2d8ff"
                      stroke="#444"
                      strokeWidth={0.6}
                    >
                      {name ? <title>{name}</title> : null}
                    </path>
                  );
                })}
              </g>

              {/* Layer 2: 円グラフ（必ず最後に描いて最前面に） */}
              <g>
                {pieOverlay!.items.map((item) => {
                  const { idx, name, cx, cy, pieData, pieSize } = item;
                  return (
                    <g
                      key={`pie-${name || idx}`}
                      transform={`translate(${cx - pieSize / 2}, ${
                        cy - pieSize / 2
                      })`}
                    >
                      <PieChart
                        data={pieData}
                        width={pieSize}
                        height={pieSize}
                        innerRadius={0}
                        padAngle={0.01}
                      />
                    </g>
                  );
                })}
              </g>
            </>
          ) : null}
        </g>
      </svg>
    </div>
  );
};
