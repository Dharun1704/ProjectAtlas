import type { BorderSnapshot } from "../data/types";
import type { PolygonLayerSpec } from "../globe/Renderer";
import { isActiveInYear } from "../time/year";
import { pointInMultiPolygon } from "./geometry";
import type { Theme } from "./theme";
import { LIGHT_THEME } from "./theme";

export const BORDERS_LAYER_ID = "borders";

/** Soft, modern fills. Colour only tells neighbours apart; it carries no meaning. */
const PALETTE = [
  "#6f9fd8", "#e2a85c", "#7dba9f", "#cf8fb4", "#8f92db", "#dd8f76",
  "#62b5b6", "#bcab5e", "#9eabbb", "#d67b85", "#7aab70", "#ab8bcc",
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
 * The snapshot valid in `year` that covers `point`, if any. Where several
 * overlap, the last one wins, matching what is drawn on top.
 */
export function findSnapshotAtPoint(
  snapshots: readonly BorderSnapshot[],
  point: readonly [number, number],
  year: number,
): BorderSnapshot | undefined {
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const s = snapshots[i] as BorderSnapshot;
    if (isActiveInYear(s.start, s.end, year) && pointInMultiPolygon(point, s.geometry.coordinates)) return s;
  }
  return undefined;
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
      highlightLine: theme.highlight,
    },
  };
}
