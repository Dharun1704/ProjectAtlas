import { describe, expect, it } from "vitest";
import type { ProcessedChunk } from "./cliopatria";
import { buildPolityMeta, importanceItem, largestShapes } from "./polityMeta";
import { toRegionAreas } from "./regions";
import type { MultiPolygonCoords } from "./simplify";

// Made-up polities, counts and shapes. Not real history or geography.
const square = (x: number, y: number, size: number): MultiPolygonCoords => [
  [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]],
];

const FAKE_AREAS = toRegionAreas([
  {
    properties: { SUBREGION: "FAKE West", CONTINENT: "FAKE Land" },
    geometry: { type: "Polygon", coordinates: square(0, 0, 10)[0] as MultiPolygonCoords[number] },
  },
]);

const snapshot = (polityId: string, coordinates: MultiPolygonCoords) => ({
  polityId,
  start: 1,
  end: 2,
  geometry: { type: "MultiPolygon" as const, coordinates },
});

const FAKE_CHUNKS: ProcessedChunk[] = [
  { chunkStart: 0, polities: {}, snapshots: [snapshot("FAKE:a", square(1, 1, 1)), snapshot("FAKE:sea", square(50, 50, 2))] },
  { chunkStart: 100, polities: {}, snapshots: [snapshot("FAKE:a", square(2, 2, 5)), snapshot("FAKE:b", square(3, 3, 1))] },
];

const FAKE_SITELINKS = { Q1: 40, Q2: 1, Q3: 7, Q9: null, Q50: 99 };
const FAKE_ARTICLES = {
  "FAKE good article": { item: "Q1" },
  "FAKE ambiguous": { item: "Q50", disambiguation: true as const },
  "FAKE no item": null,
};

describe("largestShapes", () => {
  it("keeps each polity's largest shape across all chunks", () => {
    const shapes = largestShapes(FAKE_CHUNKS);
    expect(shapes.get("FAKE:a")).toEqual(square(2, 2, 5));
    expect([...shapes.keys()].sort()).toEqual(["FAKE:a", "FAKE:b", "FAKE:sea"]);
  });
});

describe("importanceItem", () => {
  it("prefers the item behind the Wikipedia article over the dataset's own id", () => {
    expect(importanceItem({ wikipedia: "FAKE good article", wikidataId: "Q2" }, FAKE_ARTICLES, FAKE_SITELINKS)).toEqual({
      item: "Q1",
      from: "article",
    });
  });

  it("falls back to the dataset's id for a disambiguation page or an article without an item", () => {
    expect(importanceItem({ wikipedia: "FAKE ambiguous", wikidataId: "Q3" }, FAKE_ARTICLES, FAKE_SITELINKS)).toEqual({
      item: "Q3",
      from: "dataset",
    });
    expect(importanceItem({ wikipedia: "FAKE no item", wikidataId: "Q3" }, FAKE_ARTICLES, FAKE_SITELINKS)?.from).toBe(
      "dataset",
    );
  });

  it("gives nothing when no link leads to a known item", () => {
    expect(importanceItem({}, FAKE_ARTICLES, FAKE_SITELINKS)).toBeUndefined();
    expect(importanceItem({ wikidataId: "Q9" }, FAKE_ARTICLES, FAKE_SITELINKS)).toBeUndefined();
    expect(importanceItem({ wikipedia: "FAKE ambiguous" }, FAKE_ARTICLES, FAKE_SITELINKS)).toBeUndefined();
  });
});

describe("buildPolityMeta", () => {
  const meta = buildPolityMeta(
    {
      "FAKE:sea": { wikidataId: "Q3" },
      "FAKE:b": { wikipedia: "FAKE good article" },
      "FAKE:a": { wikipedia: "FAKE good article", wikidataId: "Q2" },
      "FAKE:nolink": {},
      "FAKE:gone": { wikidataId: "Q9" },
    },
    FAKE_ARTICLES,
    FAKE_SITELINKS,
    largestShapes(FAKE_CHUNKS),
    FAKE_AREAS,
  );

  it("records the count, where it came from, and whether the item is shared", () => {
    expect(meta["FAKE:a"]).toEqual({
      importance: 40,
      importanceFrom: "article",
      importanceShared: true,
      region: "FAKE West",
      continent: "FAKE Land",
    });
    expect(meta["FAKE:b"]?.importanceShared).toBe(true);
    expect(meta["FAKE:sea"]).toEqual({ importance: 7, importanceFrom: "dataset" });
  });

  it("leaves importance out when there is no link or the item is unknown", () => {
    expect(meta["FAKE:nolink"]).toEqual({});
    expect(meta["FAKE:gone"]).toEqual({});
  });

  it("leaves region out for a shape off modern land", () => {
    expect(meta["FAKE:sea"]?.region).toBeUndefined();
  });

  it("sorts polities by id", () => {
    expect(Object.keys(meta)).toEqual(["FAKE:a", "FAKE:b", "FAKE:gone", "FAKE:nolink", "FAKE:sea"]);
  });
});
