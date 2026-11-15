import type { Position } from "geojson";

/**
 * Point-in-polygon tests on longitude/latitude treated as a flat plane. Good
 * enough for "which polity did the user click"; shapes that cross the
 * antimeridian are not handled.
 */

/** Ray casting: true when `point` is inside the closed ring. */
export function pointInRing(point: readonly [number, number], ring: readonly Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Position;
    const b = ring[j] as Position;
    const ax = a[0] as number;
    const ay = a[1] as number;
    const bx = b[0] as number;
    const by = b[1] as number;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** True when `point` is inside any polygon: within its outer ring and outside all its holes. */
export function pointInMultiPolygon(point: readonly [number, number], coordinates: readonly Position[][][]): boolean {
  for (const polygon of coordinates) {
    const outer = polygon[0];
    if (!outer || !pointInRing(point, outer)) continue;
    let inHole = false;
    for (let i = 1; i < polygon.length; i++) {
      if (pointInRing(point, polygon[i] as Position[])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

/** Signed planar area of a ring; the sign gives its winding direction. */
function signedRingArea(ring: readonly Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j] as Position;
    const b = ring[i] as Position;
    sum += (a[0] as number) * (b[1] as number) - (b[0] as number) * (a[1] as number);
  }
  return sum / 2;
}

/** Outer ring of the polygon with the largest area. */
export function largestOuterRing(coordinates: readonly Position[][][]): Position[] | undefined {
  let best: Position[] | undefined;
  let bestArea = -1;
  for (const polygon of coordinates) {
    const outer = polygon[0];
    if (!outer) continue;
    const area = Math.abs(signedRingArea(outer));
    if (area > bestArea) {
      bestArea = area;
      best = outer;
    }
  }
  return best;
}

/** Total planar area of all polygons, holes subtracted, in square degrees. */
export function multiPolygonArea(coordinates: readonly Position[][][]): number {
  let total = 0;
  for (const polygon of coordinates) {
    polygon.forEach((ring, i) => {
      const area = Math.abs(signedRingArea(ring));
      total += i === 0 ? area : -area;
    });
  }
  return total;
}

/**
 * A point guaranteed to lie inside the largest polygon: its centroid when that
 * falls inside the shape, otherwise the middle of the widest stretch of the
 * shape along the centroid's latitude (for crescents and other hollow shapes).
 */
export function representativePoint(coordinates: readonly Position[][][]): [number, number] | undefined {
  const ring = largestOuterRing(coordinates);
  if (!ring || ring.length === 0) return undefined;
  const first = ring[0] as Position;
  const fallback: [number, number] = [first[0] as number, first[1] as number];

  const area = signedRingArea(ring);
  if (area === 0) return fallback;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j] as Position;
    const b = ring[i] as Position;
    const cross = (a[0] as number) * (b[1] as number) - (b[0] as number) * (a[1] as number);
    cx += ((a[0] as number) + (b[0] as number)) * cross;
    cy += ((a[1] as number) + (b[1] as number)) * cross;
  }
  cx /= 6 * area;
  cy /= 6 * area;
  if (pointInRing([cx, cy], ring)) return [cx, cy];

  const crossings: number[] = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Position;
    const b = ring[j] as Position;
    const ay = a[1] as number;
    const by = b[1] as number;
    if (ay > cy !== by > cy) {
      crossings.push((((b[0] as number) - (a[0] as number)) * (cy - ay)) / (by - ay) + (a[0] as number));
    }
  }
  crossings.sort((p, q) => p - q);
  let best: [number, number] | undefined;
  let bestWidth = -1;
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const left = crossings[i] as number;
    const right = crossings[i + 1] as number;
    if (right - left > bestWidth) {
      bestWidth = right - left;
      best = [(left + right) / 2, cy];
    }
  }
  return best ?? fallback;
}
