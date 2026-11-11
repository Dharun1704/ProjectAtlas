import { describe, expect, it } from "vitest";
import { loadLand, parseLand } from "./land";

// Made-up shape in the processed land format. Not real geography.
const FAKE_LAND = {
  source: { title: "FAKE_land", license: "FAKE_license" },
  geometry: { type: "MultiPolygon", coordinates: [[[[0, 0], [10, 0], [10, 10], [0, 0]]]] },
};

describe("parseLand", () => {
  it("reads the source and geometry", () => {
    const land = parseLand(FAKE_LAND);
    expect(land.source).toEqual({ title: "FAKE_land", license: "FAKE_license" });
    expect(land.geometry.type).toBe("MultiPolygon");
  });

  it("rejects a file without a source or with the wrong geometry", () => {
    expect(() => parseLand({ geometry: FAKE_LAND.geometry })).toThrow();
    expect(() => parseLand({ source: FAKE_LAND.source, geometry: { type: "Polygon", coordinates: [] } })).toThrow();
  });
});

describe("loadLand", () => {
  it("returns null when the file has not been generated", async () => {
    expect(await loadLand(async () => null)).toBeNull();
  });

  it("loads from base/land.json", async () => {
    const paths: string[] = [];
    const land = await loadLand(async (path) => {
      paths.push(path);
      return FAKE_LAND;
    });
    expect(paths).toEqual(["base/land.json"]);
    expect(land?.source.title).toBe("FAKE_land");
  });
});
