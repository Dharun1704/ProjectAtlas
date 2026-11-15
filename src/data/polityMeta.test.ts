import { describe, expect, it } from "vitest";
import { createPolityMetaLoader, parsePolityMetaSet } from "./polityMeta";

// Made-up meta file. Not real history.
const FAKE_FILE = {
  sources: {
    importance: { title: "FAKE_counts", license: "FAKE_license" },
    region: { title: "FAKE_regions", url: "https://example.invalid" },
  },
  polities: {
    "FAKE:a": { importance: 40, importanceFrom: "article", region: "FAKE West", continent: "FAKE Land" },
    "FAKE:b": {},
  },
};

describe("parsePolityMetaSet", () => {
  it("reads importance, region and the sources", () => {
    const set = parsePolityMetaSet(FAKE_FILE);
    expect(set.polities["FAKE:a"]).toEqual({ importance: 40, region: "FAKE West", continent: "FAKE Land" });
    expect(set.sources.importance).toEqual({ title: "FAKE_counts", license: "FAKE_license" });
    expect(set.sources.region).toEqual({ title: "FAKE_regions", url: "https://example.invalid" });
  });

  it("keeps missing fields missing", () => {
    expect(parsePolityMetaSet(FAKE_FILE).polities["FAKE:b"]).toEqual({});
  });

  it("ignores an importance that is not a number", () => {
    const set = parsePolityMetaSet({ polities: { "FAKE:a": { importance: "many" } } });
    expect(set.polities["FAKE:a"]).toEqual({});
  });

  it("rejects a file without polities", () => {
    expect(() => parsePolityMetaSet({ sources: {} })).toThrow();
  });
});

describe("createPolityMetaLoader", () => {
  it("is empty when nothing has been generated", async () => {
    expect(await createPolityMetaLoader(async () => null)()).toEqual({ sources: {}, polities: {} });
  });

  it("fetches meta/polities.json once", async () => {
    const paths: string[] = [];
    const load = createPolityMetaLoader(async (path) => {
      paths.push(path);
      return FAKE_FILE;
    });
    await load();
    await load();
    expect(paths).toEqual(["meta/polities.json"]);
  });
});
