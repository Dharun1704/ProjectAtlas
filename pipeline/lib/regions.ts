import { largestOuterRing, pointInMultiPolygon, representativePoint } from "../../src/layers/geometry.ts";
import type { MultiPolygonCoords } from "./simplify.ts";

/** One modern country from Natural Earth, reduced to what region lookup needs. */
export type RegionArea = {
  region: string;
  continent: string;
  coordinates: MultiPolygonCoords;
  bbox: [minX: number, minY: number, maxX: number, maxY: number];
};

export type CountryFeature = {
  properties: { SUBREGION?: string; CONTINENT?: string };
  geometry:
    | { type: "Polygon"; coordinates: MultiPolygonCoords[number] }
    | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
};

/** Natural Earth's label for areas that belong to no region. */
const OPEN_OCEAN = "Seven seas (open ocean)";

export function toRegionAreas(features: readonly CountryFeature[]): RegionArea[] {
  const areas: RegionArea[] = [];
  for (const feature of features) {
    const region = feature.properties.SUBREGION;
    const continent = feature.properties.CONTINENT;
    if (!region || !continent || region === OPEN_OCEAN || continent === OPEN_OCEAN) continue;
    const coordinates = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const polygon of coordinates) {
      for (const [x, y] of polygon[0] ?? []) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    areas.push({ region, continent, coordinates, bbox: [minX, minY, maxX, maxY] });
  }
  return areas;
}

export function regionAt(
  point: readonly [number, number],
  areas: readonly RegionArea[],
): { region: string; continent: string } | undefined {
  const [x, y] = point;
  for (const area of areas) {
    const [minX, minY, maxX, maxY] = area.bbox;
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    if (pointInMultiPolygon(point, area.coordinates)) return { region: area.region, continent: area.continent };
  }
  return undefined;
}

/** Sample points per side of the grid laid over a shape. */
const GRID = 24;

/**
 * The modern region holding most of a historical shape. A grid of points is
 * laid over the shape; each point inside it votes for the region it falls in,
 * and the region with the most votes wins (ties go to the alphabetically first,
 * so the result is deterministic).
 *
 * When no sample point lands on modern land (a very small shape, or one drawn
 * slightly offshore of the modern coast), the shape's inside point is tried,
 * then up to 40 points along its outline. Undefined when none is on modern land.
 */
export function regionOfShape(
  coordinates: MultiPolygonCoords,
  areas: readonly RegionArea[],
): { region: string; continent: string } | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of coordinates) {
    for (const [x, y] of polygon[0] ?? []) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const votes = new Map<string, { count: number; continent: string }>();
  if (minX < maxX && minY < maxY) {
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const point: [number, number] = [
          minX + ((i + 0.5) / GRID) * (maxX - minX),
          minY + ((j + 0.5) / GRID) * (maxY - minY),
        ];
        if (!pointInMultiPolygon(point, coordinates)) continue;
        const hit = regionAt(point, areas);
        if (!hit) continue;
        const vote = votes.get(hit.region);
        if (vote) vote.count++;
        else votes.set(hit.region, { count: 1, continent: hit.continent });
      }
    }
  }
  if (votes.size > 0) {
    const [region, vote] = [...votes].sort(([a, va], [b, vb]) => vb.count - va.count || (a < b ? -1 : 1))[0] as [
      string,
      { count: number; continent: string },
    ];
    return { region, continent: vote.continent };
  }

  const inside = representativePoint(coordinates);
  if (inside) {
    const hit = regionAt(inside, areas);
    if (hit) return hit;
  }
  const ring = largestOuterRing(coordinates) ?? [];
  const step = Math.max(1, Math.ceil(ring.length / 40));
  for (let i = 0; i < ring.length; i += step) {
    const p = ring[i];
    if (!p) continue;
    const hit = regionAt([p[0] as number, p[1] as number], areas);
    if (hit) return hit;
  }
  return undefined;
}
