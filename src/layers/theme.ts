/** Globe colours. Light is an old paper map; dark is a globe at night. */
export type Theme = {
  name: "light" | "dark";
  sea: string;
  land: string;
  coast: string;
  grid: string;
  gridOpacity: number;
  borderLine: string;
  borderFillOpacity: number;
};

export const LIGHT_THEME: Theme = {
  name: "light",
  sea: "#c3cfc9",
  land: "#ebe1c7",
  coast: "#8a7a5c",
  grid: "#6b5a3e",
  gridOpacity: 0.35,
  borderLine: "#4a3520",
  borderFillOpacity: 0.5,
};

export const DARK_THEME: Theme = {
  name: "dark",
  sea: "#0d1626",
  land: "#252b38",
  coast: "#56607a",
  grid: "#8791ad",
  gridOpacity: 0.22,
  borderLine: "#e6dcc3",
  borderFillOpacity: 0.55,
};
