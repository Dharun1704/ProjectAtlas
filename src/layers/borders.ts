import type { BorderSnapshot } from "../data/types";
import type { PolygonLayerSpec } from "../globe/Renderer";
import { isActiveInYear } from "../time/year";
import type { Theme } from "./theme";
import { LIGHT_THEME } from "./theme";

export const BORDERS_LAYER_ID = "borders";

/** Muted, old-map fills. Colour only tells neighbours apart; it carries no meaning. */
const PALETTE = [
  "#b5651d", "#8a9a5b", "#a0522d", "#6b8e9f", "#c2956b", "#7d6b91",
  "#9c6b4e", "#5f8575", "#b8860b", "#8f5e5e", "#6e7f4f", "#a67b5b",
];

/** Stable colour for a polity: the same id always gets the same colour. */
export function polityColor(polityId: string): string {
  let hash = 0;
  for (let i = 0; i < polityId.length; i++) {
    hash = (hash * 31 + polityId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] as string;
}

/** The snapshot of one polity that is valid in `year`, if any. */
export function findActiveSnapshot(
  snapshots: readonly BorderSnapshot[],
  polityId: string,
  year: number,
): BorderSnapshot | undefined {
  return snapshots.find((s) => s.polityId === polityId && isActiveInYear(s.start, s.end, year));
}

/**
 * Turns border snapshots into a time-filtered polygon layer. Each feature
 * carries its validity range, so the renderer shows or hides it as the year
 * changes without this function running again.
 */
export function bordersLayer(snapshots: readonly BorderSnapshot[], theme: Theme = LIGHT_THEME): PolygonLayerSpec {
  return {
    id: BORDERS_LAYER_ID,
    kind: "polygons",
    z: 20,
    timeFiltered: true,
    clickable: true,
    data: {
      type: "FeatureCollection",
      features: snapshots.map((s) => ({
        type: "Feature",
        properties: {
          polityId: s.polityId,
          start: s.start,
          end: s.end,
          confidence: s.confidence,
          color: polityColor(s.polityId),
        },
        geometry: s.geometry,
      })),
    },
    style: {
      fill: "#a8703f",
      fillOpacity: theme.borderFillOpacity,
      line: theme.borderLine,
      lineWidth: 1,
      softenByConfidence: true,
    },
  };
}
