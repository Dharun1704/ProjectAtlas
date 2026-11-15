import { describe, expect, it } from "vitest";
import { regionAt, regionOfShape, toRegionAreas } from "./regions";
import type { CountryFeature } from "./regions";
import type { MultiPolygonCoords } from "./simplify";

// Made-up countries and shapes. Not real geography.
const FAKE_COUNTRIES: CountryFeature[] = [
  {
    properties: { SUBREGION: "FAKE West", CONTINENT: "FAKE Land" },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
  },
  {
    properties: { SUBREGION: "FAKE East", CONTINENT: "FAKE Land" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [[[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]], [[[40, 0], [45, 0], [45, 5], [40, 5], [40, 0]]]],
    },
  },
  {
    properties: { SUBREGION: "Seven seas (open ocean)", CONTINENT: "Seven seas (open ocean)" },
    geometry: { type: "Polygon", coordinates: [[[60, 0], [70, 0], [70, 10], [60, 10], [60, 0]]] },
  },
];

const areas = toRegionAreas(FAKE_COUNTRIES);
const square = (x: number, y: number, size: number): MultiPolygonCoords => [
  [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]],
];

describe("toRegionAreas", () => {
  it("drops areas Natural Earth marks as open ocean", () => {
    expect(areas.map((a) => a.region)).toEqual(["FAKE West", "FAKE East"]);
  });
});

describe("regionAt", () => {
  it("finds the region containing a point", () => {
    expect(regionAt([5, 5], areas)).toEqual({ region: "FAKE West", continent: "FAKE Land" });
    expect(regionAt([42, 2], areas)).toEqual({ region: "FAKE East", continent: "FAKE Land" });
  });

  it("returns nothing for a point outside every country", () => {
    expect(regionAt([15, 5], areas)).toBeUndefined();
    expect(regionAt([65, 5], areas)).toBeUndefined();
  });
});

describe("regionOfShape", () => {
  it("finds the region a shape lies in", () => {
    expect(regionOfShape(square(2, 2, 4), areas)?.region).toBe("FAKE West");
  });

  it("picks the region holding most of a shape that spans two", () => {
    // FAKE West covers x 0..10 and FAKE East x 20..30. This strip overlaps West for
    // 2 units and East for 9; the next one overlaps West for 9 and East for 2.
    const mostlyEast: MultiPolygonCoords = [[[[8, 2], [29, 2], [29, 8], [8, 8], [8, 2]]]];
    expect(regionOfShape(mostlyEast, areas)?.region).toBe("FAKE East");
    const mostlyWest: MultiPolygonCoords = [[[[1, 2], [22, 2], [22, 8], [1, 8], [1, 2]]]];
    expect(regionOfShape(mostlyWest, areas)?.region).toBe("FAKE West");
  });

  it("breaks an exact tie alphabetically, so the answer never varies", () => {
    const even: MultiPolygonCoords = [[[[5, 2], [25, 2], [25, 8], [5, 8], [5, 2]]]];
    expect(regionOfShape(even, areas)?.region).toBe("FAKE East");
  });

  it("falls back to the outline for a shape too small for any sample to reach land", () => {
    // A thin wedge: only its sharp tip at (9.9, 4) is inside FAKE West, and the tip is
    // narrower than the gap between sample points.
    const sliver: MultiPolygonCoords = [[[[9.9, 4], [12, 3.9], [12, 4.1], [9.9, 4]]]];
    expect(regionOfShape(sliver, areas)?.region).toBe("FAKE West");
  });

  it("returns nothing, instead of guessing, for a shape wholly off modern land", () => {
    expect(regionOfShape(square(80, 40, 2), areas)).toBeUndefined();
  });
});
