/**
 * Globe colours. Light is a clean, pale map; dark is a globe at night.
 * Panel colours live in src/app/app.css; keep the two in step.
 */
export type Theme = {
  name: "light" | "dark";
  sea: string;
  land: string;
  coast: string;
  grid: string;
  gridOpacity: number;
  borderLine: string;
  borderFillOpacity: number;
  highlight: string;
};

export const LIGHT_THEME: Theme = {
  name: "light",
  sea: "#c6d8e8",
  land: "#f4f2ec",
  coast: "#aab6c3",
  grid: "#8a97a6",
  gridOpacity: 0.22,
  borderLine: "#ffffff",
  borderFillOpacity: 0.72,
  highlight: "#1f4fbf",
};

export const DARK_THEME: Theme = {
  name: "dark",
  sea: "#152033",
  land: "#252f42",
  coast: "#3d4a61",
  grid: "#64748b",
  gridOpacity: 0.2,
  borderLine: "#152033",
  borderFillOpacity: 0.78,
  highlight: "#ffffff",
};
