import { describe, expect, it } from "vitest";
import { ringArea, roundRing, simplifyLine, simplifyMultiPolygon, simplifyRing } from "./simplify";
import type { Position, Ring } from "./simplify";

// Made-up shapes for testing geometry code. Not real places.
const FAKE_SQUARE: Ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
const FAKE_TINY: Ring = [[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]];

describe("simplifyLine", () => {
  it("removes points that lie within the tolerance of a straight line", () => {
    const line: Position[] = [[0, 0], [1, 0.001], [2, -0.001], [3, 0]];
    expect(simplifyLine(line, 0.01)).toEqual([[0, 0], [3, 0]]);
  });

  it("keeps points that stick out further than the tolerance", () => {
    const line: Position[] = [[0, 0], [1, 5], [2, 0]];
    expect(simplifyLine(line, 0.01)).toEqual(line);
  });

  it("does not modify its input", () => {
    const line: Position[] = [[0, 0], [1, 0.001], [2, 0]];
    const copy = JSON.stringify(line);
    simplifyLine(line, 0.01);
    expect(JSON.stringify(line)).toBe(copy);
  });

  it("handles very long lines without overflowing the stack", () => {
    const line: Position[] = Array.from({ length: 20_000 }, (_, i) => [i / 1000, Math.sin(i)]);
    expect(simplifyLine(line, 0.0001).length).toBeGreaterThan(1000);
  });
});

describe("ringArea", () => {
  it("measures a square regardless of winding direction", () => {
    expect(ringArea(FAKE_SQUARE)).toBe(100);
    expect(ringArea([...FAKE_SQUARE].reverse())).toBe(100);
  });
});

describe("roundRing", () => {
  it("rounds, drops consecutive duplicates and keeps the ring closed", () => {
    const ring: Ring = [[0.001, 0.001], [0.002, 0.002], [5.006, 0], [5, 5], [0.001, 0.001]];
    expect(roundRing(ring, 2)).toEqual([[0, 0], [5.01, 0], [5, 5], [0, 0]]);
  });

  it("never writes negative zero", () => {
    const out = roundRing([[-0.0001, -0.0001], [1, 0], [1, 1], [-0.0001, -0.0001]], 2);
    expect(Object.is(out[0]?.[0], -0)).toBe(false);
    expect(JSON.stringify(out[0])).toBe("[0,0]");
  });
});

describe("simplifyRing", () => {
  it("keeps a simple ring intact and closed", () => {
    expect(simplifyRing(FAKE_SQUARE, 0.05, 2, 0.0025)).toEqual(FAKE_SQUARE);
  });

  it("returns null for a ring smaller than the minimum area", () => {
    expect(simplifyRing(FAKE_TINY, 0.05, 2, 0.0025)).toBeNull();
  });
});

describe("simplifyMultiPolygon", () => {
  const options = { tolerance: 0.05, decimals: 2 };

  it("drops tiny polygons and tiny holes but keeps the rest", () => {
    const hole: Ring = FAKE_TINY.map(([x, y]) => [x + 5, y + 5]);
    const result = simplifyMultiPolygon([[FAKE_SQUARE, hole], [FAKE_TINY]], options);
    expect(result.usedFallback).toBe(false);
    expect(result.coordinates).toEqual([[FAKE_SQUARE]]);
  });

  it("keeps a real hole", () => {
    const hole: Ring = [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]];
    expect(simplifyMultiPolygon([[FAKE_SQUARE, hole]], options).coordinates).toEqual([[FAKE_SQUARE, hole]]);
  });

  it("never lets a very small shape vanish: falls back to its largest ring", () => {
    const result = simplifyMultiPolygon([[FAKE_TINY]], options);
    expect(result.usedFallback).toBe(true);
    expect(result.coordinates).toHaveLength(1);
    expect(result.coordinates[0]?.[0]?.length).toBeGreaterThanOrEqual(4);
  });

  it("gives the same output when run twice", () => {
    const input = [[FAKE_SQUARE], [FAKE_TINY]];
    expect(JSON.stringify(simplifyMultiPolygon(input, options))).toBe(
      JSON.stringify(simplifyMultiPolygon(input, options)),
    );
  });
});
