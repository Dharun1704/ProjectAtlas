import { describe, expect, it } from "vitest";
import { createBorderLoader, parseBorderChunk, parseBorderIndex, parsePolityRecords } from "./borders";
import type { FetchJson } from "./borders";

// Made-up data in the processed-chunk format. Not real history.
const FAKE_INDEX = {
  source: { title: "FAKE_dataset", url: "https://example.invalid", license: "FAKE_license" },
  defaultConfidence: "medium",
  minYear: -49,
  maxYear: 150,
  chunks: [-100, 0, 100],
};

const FAKE_GEOMETRY = { type: "MultiPolygon", coordinates: [[[[0, 0], [10, 0], [10, 10], [0, 0]]]] };

function FAKE_chunk(chunkStart: number) {
  return {
    chunkStart,
    polities: { "FAKE:a": { name: "FAKE_A", wikidataId: "FAKE_Q1" } },
    snapshots: [{ polityId: "FAKE:a", start: -49, end: 0, geometry: FAKE_GEOMETRY }],
  };
}

function FAKE_fetcher(files: Record<string, unknown>): { fetchJson: FetchJson; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetchJson: async (path) => {
      calls.push(path);
      return path in files ? files[path] : null;
    },
  };
}

describe("parseBorderIndex", () => {
  it("reads a valid index", () => {
    const index = parseBorderIndex(FAKE_INDEX);
    expect(index.chunks).toEqual([-100, 0, 100]);
    expect(index.source).toEqual({ title: "FAKE_dataset", url: "https://example.invalid", license: "FAKE_license" });
    expect(index.defaultConfidence).toBe("medium");
  });

  it("rejects an index without a valid confidence", () => {
    expect(() => parseBorderIndex({ ...FAKE_INDEX, defaultConfidence: "certain" })).toThrow();
  });

  it("rejects something that is not an index", () => {
    expect(() => parseBorderIndex([])).toThrow();
    expect(() => parseBorderIndex(null)).toThrow();
  });
});

describe("parseBorderChunk", () => {
  const index = parseBorderIndex(FAKE_INDEX);

  it("attaches the dataset's source and confidence to every snapshot", () => {
    const chunk = parseBorderChunk(FAKE_chunk(0), index);
    expect(chunk.snapshots).toHaveLength(1);
    expect(chunk.snapshots[0]).toMatchObject({
      polityId: "FAKE:a",
      start: -49,
      end: 0,
      confidence: "medium",
      sources: [index.source],
    });
    expect(chunk.polities["FAKE:a"]).toEqual({ name: "FAKE_A", wikidataId: "FAKE_Q1" });
  });

  it("rejects a snapshot whose range runs backwards", () => {
    const bad = FAKE_chunk(0);
    bad.snapshots[0] = { polityId: "FAKE:a", start: 5, end: 1, geometry: FAKE_GEOMETRY };
    expect(() => parseBorderChunk(bad, index)).toThrow();
  });

  it("rejects a snapshot without MultiPolygon geometry", () => {
    const bad = FAKE_chunk(0);
    bad.snapshots[0] = { polityId: "FAKE:a", start: 1, end: 5, geometry: { type: "Point", coordinates: [] } };
    expect(() => parseBorderChunk(bad, index)).toThrow();
  });
});

describe("createBorderLoader", () => {
  it("returns no index and empty chunks when nothing has been generated", async () => {
    const loader = createBorderLoader(FAKE_fetcher({}).fetchJson);
    expect(await loader.loadIndex()).toBeNull();
    expect((await loader.loadChunk(0)).snapshots).toEqual([]);
  });

  it("loads a chunk across the BCE/CE boundary", async () => {
    const { fetchJson } = FAKE_fetcher({
      "borders/index.json": FAKE_INDEX,
      "borders/-100.json": FAKE_chunk(-100),
      "borders/0.json": FAKE_chunk(0),
    });
    const loader = createBorderLoader(fetchJson);
    expect((await loader.loadChunk(-100)).chunkStart).toBe(-100);
    expect((await loader.loadChunk(0)).chunkStart).toBe(0);
  });

  it("does not request a chunk the index does not list", async () => {
    const { fetchJson, calls } = FAKE_fetcher({ "borders/index.json": FAKE_INDEX });
    const loader = createBorderLoader(fetchJson);
    expect((await loader.loadChunk(-3000)).snapshots).toEqual([]);
    expect(calls).toEqual(["borders/index.json"]);
  });

  it("fetches each file once, however often it is asked for", async () => {
    const { fetchJson, calls } = FAKE_fetcher({ "borders/index.json": FAKE_INDEX, "borders/0.json": FAKE_chunk(0) });
    const loader = createBorderLoader(fetchJson);
    await Promise.all([loader.loadChunk(0), loader.loadChunk(0), loader.loadIndex()]);
    await loader.loadChunk(0);
    expect(calls.sort()).toEqual(["borders/0.json", "borders/index.json"]);
  });

  it("retries a chunk after a failed load", async () => {
    let fail = true;
    const loader = createBorderLoader(async (path) => {
      if (path === "borders/index.json") return FAKE_INDEX;
      if (fail) throw new Error("FAKE network error");
      return FAKE_chunk(0);
    });
    await expect(loader.loadChunk(0)).rejects.toThrow();
    fail = false;
    expect((await loader.loadChunk(0)).snapshots).toHaveLength(1);
  });
});

describe("parsePolityRecords", () => {
  it("reads each polity's name, links and year range", () => {
    const records = parsePolityRecords({
      "FAKE:a": { name: "FAKE_A", wikidataId: "FAKE_Q1", wikipedia: "FAKE_page", start: -49, end: 150 },
      "FAKE:b": { name: "FAKE_B", start: 120, end: 130 },
    });
    expect(records["FAKE:a"]).toEqual({
      name: "FAKE_A",
      wikidataId: "FAKE_Q1",
      wikipedia: "FAKE_page",
      start: -49,
      end: 150,
    });
    expect(records["FAKE:b"]).toEqual({ name: "FAKE_B", start: 120, end: 130 });
  });

  it("rejects a polity without a year range", () => {
    expect(() => parsePolityRecords({ "FAKE:a": { name: "FAKE_A" } })).toThrow();
  });
});

describe("loadPolities", () => {
  it("is empty when nothing has been generated", async () => {
    expect(await createBorderLoader(async () => null).loadPolities()).toEqual({});
  });
});
