import type { MultiPolygon } from "geojson";
import type { PolygonLayerSpec } from "../globe/Renderer";
import type { Theme } from "./theme";

export const LAND_LAYER_ID = "land";

/** Modern land and coastlines, drawn under everything else as a plain backdrop. */
export function landLayer(geometry: MultiPolygon, theme: Theme): PolygonLayerSpec {
  return {
    id: LAND_LAYER_ID,
    kind: "polygons",
    z: 10,
    timeFiltered: false,
    clickable: false,
    data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry }] },
    style: {
      fill: theme.land,
      fillOpacity: 1,
      line: theme.coast,
      lineWidth: 0.6,
      softenByConfidence: false,
    },
  };
}
