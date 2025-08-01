export type WordLayoutData = {
  name: string;
  data: WordLayoutDetailData[];
};

export type WordLayoutDetailData = {
  word: string;
  tfidf_score: number;
  font_size: number;
  print_area_x: [number, number];
  print_area_y: [number, number];
  x: number;
  y: number;
  norm_x: number;
  norm_y: number;
  orientation: null;
  color: string;
};
