import { calcChartDataObject } from "./calcChartDataObject";

export const wordCloudDataFetcher = async (key: string) => {
  if (key === "all") {
    return fetch(`/data/wordcloud_layout.json`)
      .then((res) => res.json())
      .then((data) => calcChartDataObject(data));
  } else {
    return fetch(
      `/data/wordcloud_map_layer/${key}/wordcloud_layout_detail.json`
    )
      .then((res) => res.json())
      .then((data) => calcChartDataObject(data));
  }
};
