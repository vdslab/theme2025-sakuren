import * as d3 from "d3";
import wordData from "./../wordcloud_layout.json";

export const App = () => {
  const width = 1600;
  const height = 1600;
  const margin = 0;

  const F = wordData.map((item) => item.font_size);

  const xScale = d3
    .scaleLinear()
    .domain([0, 800])
    .range([margin, width - margin])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 800])
    .range([margin, height - margin])
    .nice();

  const fontScale = d3
    .scaleLinear()
    .domain([Math.min(...F), Math.max(...F)])
    .range([10, 112]);

  // MeCabのorientation→角度変換
  const angleMap:{[key: string]: number;null:number,0:number,1:number,2:number,3:number} = {
    null: 0,
    0: 0,
    1: 90,
    2:-90,
    3: 270,
  };

  return (
    <div style={{ backgroundColor: "white" }}>
      <svg width={width} height={height}>
        {wordData.map((item:{word:string,font_size: number,x: number,y: number,orientation: number|null,color:string}, index:number) => {
          const orientationKey:string|number =
            item.orientation === null ? "null" : item.orientation;
          const angle = angleMap[orientationKey];
          if (orientationKey == 0) {
            return;
          }
          const x = xScale(item.x);
          const y = yScale(angle==0?item.y:item.y+item.word.length*item.font_size);
          const fontSize = fontScale(item.font_size);

          return (
            <text
              key={index}
              x={x}
              y={y}
              fontSize={fontSize}
              fill={item.color}
              textAnchor="start"
              dominantBaseline="hanging"
              transform={`rotate(${angle}, ${x}, ${y})`}
              style={{ fontFamily: '"游ゴシック"' }}
            >
              {item.word}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
