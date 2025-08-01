import * as d3 from "d3";
import * as d3geo from "d3-geo";
import { useEffect, useState } from "react";
import MunicipalityMap_wordText from "./MunicipalityMap_wordText";

interface MunicipalityMapProps {
  bounds: Record<string, any>;
  group: any;
  gIdx: number;
}

const MunicipalityMap = ({ bounds, group, gIdx }: MunicipalityMapProps) => {
  const [geoFeatureParts, setGeoFeatureParts] = useState<any[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<any[]>([]);

  // GeoJSON読み込み
  useEffect(() => {
    fetch("/municipalities_full.geojson")
      .then((res) => res.json())
      .then((data) => setGeoFeatureParts(data.features));
  }, []);

  // 都道府県に対応する地物だけ抽出
  useEffect(() => {
    if (!group?.name || geoFeatureParts.length === 0) {
      setFilteredFeatures([]);
      return;
    }
    const filtered = geoFeatureParts.filter(
      (f) => f.properties.N03_001 === group.name
    );
    setFilteredFeatures(filtered);
  }, [group, geoFeatureParts]);

  const groupBounds = group?.name ? bounds[group.name] : null;

  const projection = groupBounds
    ? d3geo
        .geoIdentity()
        .reflectY(true)
        .fitExtent(
          [
            [groupBounds.xlim[0], groupBounds.ylim[0]],
            [groupBounds.xlim[1], groupBounds.ylim[1]],
          ],
          {
            type: "FeatureCollection",
            features: filteredFeatures,
          }
        )
    : null;

  const pathGenerator = projection ? d3.geoPath().projection(projection) : null;

  if (
    !group?.name ||
    !groupBounds ||
    !pathGenerator ||
    filteredFeatures.length === 0
  )
    return null;

  return (
    <g key={gIdx} className="municipality-map">
      {filteredFeatures.map((feature, idx) => {
        const boundsArray = pathGenerator?.bounds(feature); // [[minX,minY],[maxX,maxY]]

        return (
          <g key={idx}>
            <path
              d={pathGenerator(feature) || ""}
              fill="#fff"
              stroke="#444"
              strokeWidth={0.5}
            />
            <MunicipalityMap_wordText
              groupName={feature}
              boundsArray={boundsArray}
            />
          </g>
        );
      })}
    </g>
  );
};

export default MunicipalityMap;
