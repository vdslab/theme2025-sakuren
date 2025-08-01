import * as d3 from "d3";
import { useEffect, useMemo, type FC } from "react";

const labelWidth = 70;

type ScaleProps = {
  xScale: d3.ScaleLinear<number, number>;
};

const Scale: FC<ScaleProps> = ({ xScale }) => {
  const xAxis = d3.axisBottom(xScale).ticks(3);

  useEffect(() => {
    const xAxisGroup = d3.select<SVGGElement, unknown>(".x-axis");
    xAxisGroup.call(xAxis);
  }, [xAxis]);

  return (
    <g
      className="x-axis"
      transform={`translate(${labelWidth}, 0)`}
      style={{
        msUserSelect: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    />
  );
};

type BarChartProps = {
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
  width: number;
  unit: string;
  onHover?: (label: string | null) => void;
};

export const BarChart: FC<BarChartProps> = ({
  data,
  maxValue: _maxValue,
  width,
  unit,
  onHover,
}) => {
  const rectHeight = 20;
  const marginY = 8;
  const headerHeight = 30;

  const height =
    data.length * rectHeight + (data.length - 1) * marginY + headerHeight;

  const maxValue = useMemo(() => {
    if (_maxValue !== undefined) return _maxValue;
    return Math.max(...data.map((item) => item.value));
  }, [data, _maxValue]);

  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, maxValue])
        .range([0, width - labelWidth]),
    [width, maxValue]
  );

  return (
    <svg width={width + 50} height={height + 40}>
      {data.length !== 0 && (
        <g transform="translate(5,20)">
          <Scale xScale={xScale} />
          <text x={width + 3} y={10} fontSize="12">
            {unit}
          </text>
          <g transform={`translate(0, ${headerHeight})`}>
            {data.map((item, index) => {
              const x = labelWidth;
              const y = index * (rectHeight + marginY);
              return (
                <g
                  key={index}
                  transform={`translate(0, ${y})`}
                  onMouseEnter={() => onHover?.(item.label)}
                  onMouseOut={() => onHover?.(null)}
                >
                  <rect
                    x={x}
                    y={0}
                    width={xScale(item.value)}
                    height={rectHeight}
                    fill={item.color}
                    style={{ transition: "width 1s" }}
                  />
                  <text
                    x={x - 10}
                    y={12}
                    fill="#000"
                    fontSize="15"
                    textAnchor="end"
                    alignmentBaseline="middle"
                    style={{
                      msUserSelect: "none",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                    }}
                  >
                    {item.label}
                  </text>
                  <text
                    x={labelWidth + 10}
                    y={12}
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="15"
                    style={{
                      msUserSelect: "none",
                      WebkitUserSelect: "none",
                      userSelect: "none",
                    }}
                  >
                    {item.value.toLocaleString()}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      )}
    </svg>
  );
};
