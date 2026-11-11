/** Geometry simplification for the browser. Pure and deterministic. */

export type Position = [number, number];
export type Ring = Position[];
export type PolygonCoords = Ring[];
export type MultiPolygonCoords = PolygonCoords[];

function sqDistToSegment(p: Position, a: Position, b: Position): number {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/**
 * Douglas-Peucker on a line. Distances are planar in degrees, which is coarse
 * near the poles but enough for a first level of detail. Iterative, so long
 * coastlines cannot overflow the stack.
 */
export function simplifyLine(points: readonly Position[], tolerance: number): Position[] {
  const n = points.length;
  if (n <= 2) return points.map((p) => [p[0], p[1]]);
  const sqTol = tolerance * tolerance;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let maxSq = 0;
    let index = -1;
    const a = points[first] as Position;
    const b = points[last] as Position;
    for (let i = first + 1; i < last; i++) {
      const sq = sqDistToSegment(points[i] as Position, a, b);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (index !== -1 && maxSq > sqTol) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out: Position[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      const p = points[i] as Position;
      out.push([p[0], p[1]]);
    }
  }
  return out;
}

/** Absolute planar area of a closed ring, in square degrees. */
export function ringArea(ring: readonly Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j] as Position;
    const b = ring[i] as Position;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  const r = Math.round(value * f) / f;
  return r === 0 ? 0 : r; // no negative zero in output
}

/** Rounds coordinates and removes consecutive duplicates. Keeps the ring closed. */
export function roundRing(ring: readonly Position[], decimals: number): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const q: Position = [roundTo(p[0], decimals), roundTo(p[1], decimals)];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== q[0] || prev[1] !== q[1]) out.push(q);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) out.push([first[0], first[1]]);
  return out;
}

/**
 * Simplifies a closed ring. Returns null when the result is no longer a valid
 * ring (fewer than 4 positions) or is smaller than `minArea` square degrees.
 */
export function simplifyRing(
  ring: readonly Position[],
  tolerance: number,
  decimals: number,
  minArea: number,
): Ring | null {
  const simplified = roundRing(simplifyLine(ring, tolerance), decimals);
  if (simplified.length < 4) return null;
  if (ringArea(simplified) < minArea) return null;
  return simplified;
}

export type SimplifyOptions = { tolerance: number; decimals: number };

/**
 * Simplifies a MultiPolygon. Polygons whose outer ring collapses are dropped,
 * as are collapsed holes. If every polygon collapses (a very small polity), the
 * largest original outer ring is kept, only rounded, so no polity disappears
 * from the map because of simplification.
 */
export function simplifyMultiPolygon(
  coords: MultiPolygonCoords,
  { tolerance, decimals }: SimplifyOptions,
): { coordinates: MultiPolygonCoords; usedFallback: boolean } {
  const minArea = tolerance * tolerance;
  const out: MultiPolygonCoords = [];
  for (const polygon of coords) {
    const outerIn = polygon[0];
    if (!outerIn) continue;
    const outer = simplifyRing(outerIn, tolerance, decimals, minArea);
    if (!outer) continue;
    const rings: PolygonCoords = [outer];
    for (let i = 1; i < polygon.length; i++) {
      const hole = simplifyRing(polygon[i] as Ring, tolerance, decimals, minArea);
      if (hole) rings.push(hole);
    }
    out.push(rings);
  }
  if (out.length > 0) return { coordinates: out, usedFallback: false };

  let largest: Ring | null = null;
  let largestArea = -1;
  for (const polygon of coords) {
    const outer = polygon[0];
    if (!outer) continue;
    const area = ringArea(outer);
    if (area > largestArea) {
      largestArea = area;
      largest = outer;
    }
  }
  if (!largest) return { coordinates: [], usedFallback: true };
  // Keep more decimals here: at the normal precision a tiny ring can collapse to a point.
  return { coordinates: [[roundRing(largest, decimals + 2)]], usedFallback: true };
}
