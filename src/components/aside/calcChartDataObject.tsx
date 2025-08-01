import type { WordLayoutData } from "../../types/wordLayoutData";

export const calcChartDataObject = (data: WordLayoutData[]) => {
  const obj = {} as Record<string, Record<string, number>>;
  data.forEach((item) => {
    const { name, data: value } = item;
    obj[name] = value.reduce((acc, cur) => {
      acc[cur.word] = cur.tfidf_score;
      return acc;
    }, {} as Record<string, number>);
  });
  return obj;
};
