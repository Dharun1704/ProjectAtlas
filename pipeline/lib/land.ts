import { simplifyMultiPolygon } from "./simplify.ts";
import type { MultiPolygonCoords, SimplifyOptions } from "./simplify.ts";

export type LandFeature = {
  geometry:
    | { type: "Polygon"; coordinates: MultiPolygonCoords[number] }
    | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
};

/**
 * Merges land features into one simplified MultiPolygon. Islands too small to
 * survive simplification are dropped: this is a backdrop, not data about them.
 */
export function mergeLand(features: readonly LandFeature[], options: SimplifyOptions): MultiPolygonCoords {
  const out: MultiPolygonCoords = [];
  for (const feature of features) {
    const coords = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const { coordinates, usedFallback } = simplifyMultiPolygon(coords, options);
    if (!usedFallback) out.push(...coordinates);
  }
  return out;
}
