import { describe, expect, it } from "vitest";
import { buildChunks, buildPolityRecords, isDrawnRow, polityId, toSnapshot } from "./cliopatria";
import type { CliopatriaFeature } from "./cliopatria";

const OPTIONS = { tolerance: 0.05, decimals: 2 };

// Made-up rows in Cliopatria's shape. Not real history.
function FAKE_row(overrides: Partial<CliopatriaFeature["properties"]> = {}): CliopatriaFeature {
  return {
    type: "Feature",
    properties: {
      Name: "FAKE_Polity",
      FromYear: -50,
      ToYear: 0,
      Type: "POLITY",
      Wikipedia: "FAKE_page",
      Wikidata: "FAKE_Q1",
      Components: "",
      MemberOf: "",
      ...overrides,
    },
    geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
  };
}

describe("isDrawnRow", () => {
  it("draws plain polities and polities that are members of a composite", () => {
    expect(isDrawnRow(FAKE_row())).toBe(true);
    expect(isDrawnRow(FAKE_row({ MemberOf: "(FAKE_Group)" }))).toBe(true);
  });

  it("skips composite polities, which would double-draw their members", () => {
    expect(isDrawnRow(FAKE_row({ Name: "(FAKE_Group)", Components: "FAKE_A;FAKE_B" }))).toBe(false);
  });

  it("skips relation rows", () => {
    expect(isDrawnRow(FAKE_row({ Type: "RELATION", Components: "FAKE_A;FAKE_B" }))).toBe(false);
  });

  it("treats a null Components field as empty", () => {
    expect(isDrawnRow(FAKE_row({ Components: null }))).toBe(true);
  });
});

describe("toSnapshot", () => {
  it("converts years to astronomical numbering", () => {
    const { snapshot } = toSnapshot(FAKE_row({ FromYear: -50, ToYear: 0 }), OPTIONS);
    expect(snapshot.start).toBe(-49);
    expect(snapshot.end).toBe(0);
  });

  it("wraps a Polygon as a MultiPolygon", () => {
    const { snapshot } = toSnapshot(FAKE_row(), OPTIONS);
    expect(snapshot.geometry.type).toBe("MultiPolygon");
    expect(snapshot.geometry.coordinates).toHaveLength(1);
  });

  it("ids the polity by its Cliopatria name and keeps the links as given", () => {
    const { snapshot, polity } = toSnapshot(FAKE_row(), OPTIONS);
    expect(snapshot.polityId).toBe(polityId("FAKE_Polity"));
    expect(polity).toEqual({ name: "FAKE_Polity", wikidataId: "FAKE_Q1", wikipedia: "FAKE_page" });
  });

  it("leaves links out when the dataset has none, instead of inventing them", () => {
    const { polity } = toSnapshot(FAKE_row({ Wikidata: "", Wikipedia: null }), OPTIONS);
    expect(polity).toEqual({ name: "FAKE_Polity" });
  });
});

describe("buildChunks", () => {
  const rows = [
    toSnapshot(FAKE_row({ Name: "FAKE_A", FromYear: -50, ToYear: 0 }), OPTIONS),
    toSnapshot(FAKE_row({ Name: "FAKE_A", FromYear: 1, ToYear: 150 }), OPTIONS),
    toSnapshot(FAKE_row({ Name: "FAKE_B", FromYear: 120, ToYear: 130 }), OPTIONS),
  ];
  const chunks = buildChunks(rows);

  it("creates one chunk per century touched, in order", () => {
    expect(chunks.map((c) => c.chunkStart)).toEqual([-100, 0, 100]);
  });

  it("puts a range ending at 1 BCE in the 0..99 chunk, alongside the row that follows it", () => {
    // -50..0 in Cliopatria is -49..0 astronomical, so it touches chunks -100 and 0.
    expect(chunks[0]?.snapshots.map((s) => [s.start, s.end])).toEqual([[-49, 0]]);
    expect(chunks[1]?.snapshots.map((s) => [s.start, s.end])).toEqual([[-49, 0], [1, 150]]);
  });

  it("copies a snapshot into every chunk its range touches", () => {
    expect(chunks[2]?.snapshots.map((s) => s.polityId)).toEqual([polityId("FAKE_A"), polityId("FAKE_B")]);
  });

  it("lists each chunk's polities once", () => {
    expect(Object.keys(chunks[1]?.polities ?? {})).toEqual([polityId("FAKE_A")]);
    expect(Object.keys(chunks[2]?.polities ?? {})).toEqual([polityId("FAKE_A"), polityId("FAKE_B")]);
  });
});

describe("buildPolityRecords", () => {
  const rows = [
    toSnapshot(FAKE_row({ Name: "FAKE_B", FromYear: 120, ToYear: 130 }), OPTIONS),
    toSnapshot(FAKE_row({ Name: "FAKE_A", FromYear: 1, ToYear: 150 }), OPTIONS),
    toSnapshot(FAKE_row({ Name: "FAKE_A", FromYear: -50, ToYear: 0 }), OPTIONS),
  ];
  const records = buildPolityRecords(rows);

  it("spans the first to the last year the polity has borders", () => {
    expect(records[polityId("FAKE_A")]).toMatchObject({ name: "FAKE_A", start: -49, end: 150 });
    expect(records[polityId("FAKE_B")]).toMatchObject({ start: 120, end: 130 });
  });

  it("sorts polities by id, whatever the input order", () => {
    expect(Object.keys(records)).toEqual([polityId("FAKE_A"), polityId("FAKE_B")]);
  });
});
