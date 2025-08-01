export type WordListData = {
  [pref: string]: WordListDetail;
};

export type WordListDetail = {
  [word: string]: number;
};
