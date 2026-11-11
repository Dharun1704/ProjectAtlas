import { describe, expect, it } from "vitest";
import type { BorderSnapshot } from "../data/types";
import { BORDERS_LAYER_ID, bordersLayer, findActiveSnapshot, polityColor } from "./borders";

// Made-up test shapes. Not real history.
const FAKE_SNAPSHOTS: BorderSnapshot[] = [
  {
    polityId: "FAKE_polity_a",
    start: -50,
    end: 50,
    geometry: { type: "MultiPolygon", coordinates: [[[[0, 0], [10, 0], [10, 10], [0, 0]]]] },
    sources: [{ title: "FAKE_source" }],
    confidence: "low",
  },
  {
    polityId: "FAKE_polity_b",
    start: 1200,
    end: 1200,
    geometry: { type: "MultiPolygon", coordinates: [[[[20, 20], [30, 20], [30, 30], [20, 20]]]] },
    sources: [{ title: "FAKE_source" }],
    confidence: "high",
  },
];

describe("bordersLayer", () => {
  it("makes one time-filtered feature per snapshot", () => {
    const layer = bordersLayer(FAKE_SNAPSHOTS);
    expect(layer.id).toBe(BORDERS_LAYER_ID);
    expect(layer.timeFiltered).toBe(true);
    expect(layer.data.features).toHaveLength(2);
  });

  it("carries the validity range and confidence on each feature", () => {
    const [a, b] = bordersLayer(FAKE_SNAPSHOTS).data.features;
    expect(a?.properties).toMatchObject({ start: -50, end: 50, confidence: "low" });
    expect(b?.properties).toMatchObject({ start: 1200, end: 1200, confidence: "high" });
  });

  it("gives a polity the same colour every time", () => {
    const first = bordersLayer(FAKE_SNAPSHOTS).data.features[0]?.properties.color;
    expect(first).toMatch(/^#[0-9a-f]{6}$/);
    expect(polityColor("FAKE_polity_a")).toBe(first);
  });

  it("produces an empty layer when there is no data", () => {
    expect(bordersLayer([]).data.features).toEqual([]);
  });
});

describe("findActiveSnapshot", () => {
  it("finds the snapshot of a polity that covers the year", () => {
    expect(findActiveSnapshot(FAKE_SNAPSHOTS, "FAKE_polity_a", 0)?.start).toBe(-50);
    expect(findActiveSnapshot(FAKE_SNAPSHOTS, "FAKE_polity_a", -50)?.end).toBe(50);
  });

  it("returns nothing outside the polity's ranges or for another polity", () => {
    expect(findActiveSnapshot(FAKE_SNAPSHOTS, "FAKE_polity_a", 51)).toBeUndefined();
    expect(findActiveSnapshot(FAKE_SNAPSHOTS, "FAKE_polity_b", 0)).toBeUndefined();
  });
});
