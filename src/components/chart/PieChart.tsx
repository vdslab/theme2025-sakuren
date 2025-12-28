import * as d3 from "d3";
import { useMemo, type FC } from "react";

type PieDatum = {
  label: string;
  value: number;
  color: string;
};

type PieChartProps = {
  data: PieDatum[];
  width: number;
  height: number;
  innerRadius?: number;
  padAngle?: number;
  onHover?: (label: string | null) => void;
};

export const PieChart: FC<PieChartProps> = ({
  data,
  width,
  height,
  innerRadius = 0,
  padAngle = 0,
  onHover,
}) => {
  const filtered = useMemo(
    () => data.filter((d) => Number.isFinite(d.value) && d.value > 0),
    [data]
  );

  const total = useMemo(
    () => filtered.reduce((acc, cur) => acc + cur.value, 0),
    [filtered]
  );

  const radius = useMemo(
    () => Math.max(0, Math.min(width, height) / 2),
    [width, height]
  );

  const pie = useMemo(
    () =>
      d3
        .pie<PieDatum>()
        .sort(null)
        .padAngle(padAngle)
        .value((d) => d.value),
    [padAngle]
  );

  const arcs = useMemo(() => pie(filtered), [pie, filtered]);

  const arcPath = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<PieDatum>>()
        .innerRadius(Math.max(0, innerRadius))
        .outerRadius(radius),
    [innerRadius, radius]
  );

  const cx = width / 2;
  const cy = height / 2;

  return (
    <svg width={width} height={height} role="img" aria-label="pie chart">
      {filtered.length === 0 || total <= 0 ? (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
          No data
        </text>
      ) : (
        <g transform={`translate(${cx}, ${cy})`}>
          {arcs.map((a, i) => {
            const d = arcPath(a) ?? "";
            const percent = total > 0 ? (a.data.value / total) * 100 : 0;
            return (
              <path
                key={`${a.data.label}-${i}`}
                d={d}
                fill={a.data.color}
                stroke="#fff"
                strokeWidth={1}
                onMouseEnter={() => onHover?.(a.data.label)}
                onMouseLeave={() => onHover?.(null)}
                style={{ cursor: onHover ? "pointer" : "default" }}
              >
                <title>
                  {a.data.label}: {a.data.value.toLocaleString()} (
                  {percent.toFixed(1)}%)
                </title>
              </path>
            );
          })}
        </g>
      )}
    </svg>
  );
};
