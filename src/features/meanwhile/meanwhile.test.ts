import { describe, expect, it } from "vitest";
import type { BorderSnapshot } from "../../data/types";
import { buildMeanwhile } from "./meanwhile";

// Made-up polities. Not real history.
function FAKE_snapshot(polityId: string, start: number, end: number): BorderSnapshot {
  return {
    polityId,
    start,
    end,
    geometry: { type: "MultiPolygon", coordinates: [] },
    sources: [{ title: "FAKE_source" }],
    confidence: "medium",
  };
}

const FAKE_SNAPSHOTS = [
  FAKE_snapshot("FAKE:small", -10, 10),
  FAKE_snapshot("FAKE:big", -49, 0),
  FAKE_snapshot("FAKE:big", 1, 50),
  FAKE_snapshot("FAKE:unranked", -10, 10),
  FAKE_snapshot("FAKE:east", -10, 10),
  FAKE_snapshot("FAKE:nowhere", -10, 10),
  FAKE_snapshot("FAKE:later", 20, 30),
];

const FAKE_NAMES = {
  "FAKE:small": { name: "FAKE Small" },
  "FAKE:big": { name: "FAKE Big" },
  "FAKE:unranked": { name: "FAKE Aardvark" },
  "FAKE:east": { name: "FAKE East" },
  "FAKE:later": { name: "FAKE Later" },
};

const FAKE_META = {
  "FAKE:small": { importance: 5, region: "FAKE West", continent: "FAKE Beta" },
  "FAKE:big": { importance: 90, region: "FAKE West", continent: "FAKE Beta" },
  "FAKE:unranked": { region: "FAKE West", continent: "FAKE Beta" },
  "FAKE:east": { importance: 1, region: "FAKE East", continent: "FAKE Alpha" },
  "FAKE:later": { importance: 50, region: "FAKE West", continent: "FAKE Beta" },
};

describe("buildMeanwhile", () => {
  const groups = buildMeanwhile(FAKE_SNAPSHOTS, 0, FAKE_NAMES, FAKE_META);

  it("lists only what is mapped in the chosen year", () => {
    const ids = groups.flatMap((g) => g.entries.map((e) => e.polityId));
    expect(ids).not.toContain("FAKE:later");
    expect(ids).toHaveLength(5);
  });

  it("orders regions by continent then name, with unknown regions last", () => {
    expect(groups.map((g) => g.region)).toEqual(["FAKE East", "FAKE West", null]);
    expect(groups[2]?.continent).toBeNull();
  });

  it("puts the most important polity first and unranked ones last", () => {
    expect(groups[1]?.entries.map((e) => e.name)).toEqual(["FAKE Big", "FAKE Small", "FAKE Aardvark"]);
  });

  it("lists a polity once and gives its borders for that year, across the BCE/CE boundary", () => {
    const at = (year: number) =>
      buildMeanwhile(FAKE_SNAPSHOTS, year, FAKE_NAMES, FAKE_META)
        .flatMap((g) => g.entries)
        .filter((e) => e.polityId === "FAKE:big")
        .map((e) => [e.snapshot.start, e.snapshot.end]);
    expect(at(0)).toEqual([[-49, 0]]);
    expect(at(1)).toEqual([[1, 50]]);
  });

  it("shows a polity with no name record under its id instead of dropping it", () => {
    expect(groups[2]?.entries.map((e) => e.name)).toEqual(["FAKE:nowhere"]);
  });

  it("is empty when nothing is mapped that year", () => {
    expect(buildMeanwhile(FAKE_SNAPSHOTS, 500, FAKE_NAMES, FAKE_META)).toEqual([]);
  });
});
