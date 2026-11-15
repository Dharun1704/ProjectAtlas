import type { Position } from "geojson";
import { describe, expect, it } from "vitest";
import { largestOuterRing, multiPolygonArea, pointInMultiPolygon, pointInRing, representativePoint } from "./geometry";

// Made-up shapes. Not real places.
const FAKE_SQUARE: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
const FAKE_HOLE: Position[] = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
const FAKE_FAR_SQUARE: Position[] = [[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]];

describe("pointInRing", () => {
  it("is true inside and false outside", () => {
    expect(pointInRing([5, 5], FAKE_SQUARE)).toBe(true);
    expect(pointInRing([15, 5], FAKE_SQUARE)).toBe(false);
    expect(pointInRing([-1, -1], FAKE_SQUARE)).toBe(false);
  });

  it("works for either winding direction", () => {
    expect(pointInRing([5, 5], [...FAKE_SQUARE].reverse())).toBe(true);
  });

  it("handles a concave shape", () => {
    const FAKE_L: Position[] = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10], [0, 0]];
    expect(pointInRing([2, 8], FAKE_L)).toBe(true);
    expect(pointInRing([8, 8], FAKE_L)).toBe(false);
  });
});

describe("pointInMultiPolygon", () => {
  it("excludes holes", () => {
    expect(pointInMultiPolygon([5, 5], [[FAKE_SQUARE, FAKE_HOLE]])).toBe(false);
    expect(pointInMultiPolygon([2, 2], [[FAKE_SQUARE, FAKE_HOLE]])).toBe(true);
  });

  it("checks every polygon", () => {
    const coords = [[FAKE_SQUARE], [FAKE_FAR_SQUARE]];
    expect(pointInMultiPolygon([25, 25], coords)).toBe(true);
    expect(pointInMultiPolygon([15, 15], coords)).toBe(false);
  });

  it("is false for empty geometry", () => {
    expect(pointInMultiPolygon([0, 0], [])).toBe(false);
  });
});

describe("largestOuterRing and multiPolygonArea", () => {
  it("picks the biggest polygon", () => {
    const FAKE_SMALL: Position[] = [[50, 50], [51, 50], [51, 51], [50, 51], [50, 50]];
    expect(largestOuterRing([[FAKE_SMALL], [FAKE_SQUARE]])).toBe(FAKE_SQUARE);
    expect(largestOuterRing([])).toBeUndefined();
  });

  it("subtracts holes from the area", () => {
    expect(multiPolygonArea([[FAKE_SQUARE]])).toBe(100);
    expect(multiPolygonArea([[FAKE_SQUARE, FAKE_HOLE]])).toBe(96);
    expect(multiPolygonArea([[FAKE_SQUARE], [FAKE_FAR_SQUARE]])).toBe(200);
  });
});

describe("representativePoint", () => {
  it("is the centroid for a simple shape", () => {
    expect(representativePoint([[FAKE_SQUARE]])).toEqual([5, 5]);
  });

  it("gives the same point for either winding direction", () => {
    expect(representativePoint([[[...FAKE_SQUARE].reverse()]])).toEqual([5, 5]);
  });

  it("stays inside a hollow shape whose centroid falls outside it", () => {
    // A "C" shape: the centroid lies in the gap.
    const FAKE_C: Position[] = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 8], [10, 8], [10, 10], [0, 10], [0, 0]];
    const point = representativePoint([[FAKE_C]]);
    expect(point).toBeDefined();
    expect(pointInRing(point as [number, number], FAKE_C)).toBe(true);
  });

  it("uses the largest polygon of several", () => {
    const FAKE_SMALL: Position[] = [[50, 50], [51, 50], [51, 51], [50, 51], [50, 50]];
    expect(representativePoint([[FAKE_SMALL], [FAKE_SQUARE]])).toEqual([5, 5]);
  });

  it("returns nothing for empty geometry", () => {
    expect(representativePoint([])).toBeUndefined();
  });
});
