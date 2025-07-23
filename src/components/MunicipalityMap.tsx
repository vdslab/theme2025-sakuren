import * as d3geo from "d3-geo";
import * as d3 from "d3";
import { useMemo } from "react";

interface MunicipalityMapProps {
  bounds: Record<string, any>;
  group: any;
  geoFeatures: any[];
  gIdx: number;
  onHover: (value: object) => void;
  handleWordClick: (value: object) => void;
}

const MunicipalityMap = ({
  bounds,
  group,
  geoFeatures,
  gIdx,
  onHover,
  handleWordClick,
}: MunicipalityMapProps) => {
  // 無条件で useMemo を呼び出す（空配列などでもOK）
  const filteredFeatures = useMemo(() => {
    if (!group?.name) return [];
    return geoFeatures.filter(
      (f) => f.properties.prefecture === group.name
    );
  }, [group, geoFeatures]);

  const groupBounds = group?.name ? bounds[group.name] : null;

  const projection = useMemo(() => {
    if (!groupBounds) return null;
    return d3geo
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
      );
  }, [filteredFeatures, groupBounds]);

  const pathGenerator = useMemo(() => {
    if (!projection) return null;
    return d3.geoPath().projection(projection);
  }, [projection]);

  // 描画条件チェック
  if (!group?.name || !groupBounds || !pathGenerator || filteredFeatures.length === 0)
    return null;

  return (
    <g key={gIdx}>
      {filteredFeatures.map((feature, idx) => (
        <path
          key={idx}
          d={pathGenerator(feature) || ""}
          fill="#fff"
          stroke="#444"
          strokeWidth={0.5}
          onMouseEnter={() => onHover(feature.properties)}
          onMouseLeave={() => onHover({})}
          onClick={() => handleWordClick(feature.properties)}
        />
      ))}
    </g>
  );
};

export default MunicipalityMap;
