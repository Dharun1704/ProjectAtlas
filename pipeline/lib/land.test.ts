import { describe, expect, it } from "vitest";
import { mergeLand } from "./land";
import type { LandFeature } from "./land";

const OPTIONS = { tolerance: 0.02, decimals: 2 };

// Made-up shapes. Not real geography.
const FAKE_BIG: LandFeature = {
  geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
};
const FAKE_TWO: LandFeature = {
  geometry: {
    type: "MultiPolygon",
    coordinates: [[[[20, 0], [30, 0], [30, 10], [20, 0]]], [[[40, 0], [50, 0], [50, 10], [40, 0]]]],
  },
};
const FAKE_SPECK: LandFeature = {
  geometry: { type: "Polygon", coordinates: [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0]]] },
};

describe("mergeLand", () => {
  it("merges polygons and multipolygons into one list", () => {
    expect(mergeLand([FAKE_BIG, FAKE_TWO], OPTIONS)).toHaveLength(3);
  });

  it("drops specks too small to draw", () => {
    expect(mergeLand([FAKE_BIG, FAKE_SPECK], OPTIONS)).toHaveLength(1);
  });

  it("gives the same output when run twice", () => {
    const a = JSON.stringify(mergeLand([FAKE_BIG, FAKE_TWO, FAKE_SPECK], OPTIONS));
    expect(JSON.stringify(mergeLand([FAKE_BIG, FAKE_TWO, FAKE_SPECK], OPTIONS))).toBe(a);
  });
});
