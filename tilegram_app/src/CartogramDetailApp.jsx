import cartogram from "cartogram-chart";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { topology as topojsonTopology } from "topojson-server";

const fetchData = async (path) => {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch (e) {
    console.error("fetchData error", e);
    return null;
  }
};

const getMaxPolygon = (coords) => {
  if (!coords || coords.length === 0) return [];
  if (!Array.isArray(coords[0][0])) return coords; // Polygon
  let maxArea = -Infinity;
  let maxPolygon = coords[0][0];
  coords.forEach((polyArr) => {
    polyArr.forEach((poly) => {
      const area = Math.abs(d3.polygonArea(poly));
      if (area > maxArea) {
        maxArea = area;
        maxPolygon = poly;
      }
    });
  });
  return maxPolygon;
};

export const CartogramApp = () => {
  const [geojson, setGeojson] = useState(null);
  const [population, setPopulation] = useState(null);
  const containerRef = useRef(null);
  const [prepared, setPrepared] = useState({}); // 都道府県ごとの投影済みデータ

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
    const loadData = async () => {
      const geo = await fetchData("/data/N03-21_210101.json");
      const pop = await fetchData("/data/population_detail.json");
      if (!geo || !pop) return;

      const filtered = {
        type: "FeatureCollection",
        features: geo.features.map((f) => ({
          type: "Feature",
          properties: f.properties,
          geometry: {
            type: "Polygon",
            coordinates: [getMaxPolygon(f.geometry.coordinates)],
          },
        })),
      };

      setGeojson(filtered);
      setPopulation(pop);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!geojson || !population || !containerRef.current) return;

    containerRef.current.innerHTML = "";
    const tempPrepared = {};

    Object.values(prefectureMap).forEach((prefName) => {
      const geojson_detail = {
        type: "FeatureCollection",
        features: geojson.features.filter(
          (f) => f.properties.N03_001 === prefName
        ),
      };
      if (!geojson_detail.features.length) return;

      const popData = population.find((f) => f.N001 === prefName)?.data || {};
      console.log(popData);
      const div = document.createElement("div");
      div.style.width = "400px";
      div.style.height = "400px";
      div.style.display = "inline-block";
      div.style.margin = "4px";
      containerRef.current.appendChild(div);

      const projection = d3.geoMercator().fitSize([400, 400], geojson_detail);

      const valueFn = (d) => {
        const name =
          d.properties.N03_003?.endsWith("市") ||
          d.properties.N03_003?.endsWith("郡")
            ? d.properties.N03_003
            : d.properties.N03_004;
        return Math.sqrt(popData[name] || 1);
      };

      const chart = cartogram().projection(projection).width(400).height(400);
      const topo = topojsonTopology({ prefectures: geojson_detail }, 1e5);
      chart(div, {
        topoJson: topo,
        topoObjectName: "prefectures",
        iterations: 60,
        value: valueFn,
      });

      // 投影済み topo.features を保存
      setTimeout(() => {
        try {
          const svgNode = div.querySelector("svg");
          if (!svgNode) return;
          const paths = svgNode.querySelectorAll("path.feature");
          const features = Array.from(paths).map((p) => {
            const feat = JSON.parse(p.dataset.feature); // cartogram が data-feature に持っている
            // 逆投影
            const invertCoords = (coords) => {
              if (!Array.isArray(coords)) return coords;
              if (typeof coords[0] === "number") {
                const lonlat = projection.invert([coords[0], coords[1]]);
                return lonlat || [NaN, NaN];
              }
              return coords.map((c) => invertCoords(c));
            };
            feat.geometry.coordinates = invertCoords(feat.geometry.coordinates);
            return feat;
          });
          tempPrepared[prefName] = { type: "FeatureCollection", features };
          setPrepared({ ...tempPrepared });
        } catch (e) {
          console.warn(prefName, e);
        }
      }, 1000);
    });
  }, [geojson, population]);

  const downloadGeoJSON = (pref) => {
    if (!prepared[pref]) {
      alert("まだ逆投影データが準備されていません");
      return;
    }
    const text = JSON.stringify(prepared[pref]);
    const blob = new Blob([text], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pref}_lonlat.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>日本の人口カルトグラム（逆投影 GeoJSON）</h2>
      <div style={{ marginTop: 12 }}>
        {Object.values(prefectureMap).map((pref) => (
          <button
            key={pref}
            onClick={() => downloadGeoJSON(pref)}
            style={{ margin: 2 }}
          >
            {pref} GeoJSON ダウンロード
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
      ></div>
    </div>
  );
};
