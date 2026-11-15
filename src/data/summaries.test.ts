import { describe, expect, it } from "vitest";
import { createSummaryLoader, parseSummarySet } from "./summaries";

// Made-up summary file. Not real history.
const FAKE_FILE = {
  source: { title: "FAKE_wiki", url: "https://example.invalid", license: "FAKE_license" },
  fetchedOn: "2000-01-01",
  summaries: {
    "FAKE:a": { text: "FAKE text.", shortened: true, article: "FAKE article", url: "https://example.invalid/a", revision: 1 },
  },
};

describe("parseSummarySet", () => {
  it("reads the source and each summary", () => {
    const set = parseSummarySet(FAKE_FILE);
    expect(set.source).toEqual({ title: "FAKE_wiki", url: "https://example.invalid", license: "FAKE_license" });
    expect(set.summaries["FAKE:a"]).toEqual({
      text: "FAKE text.",
      shortened: true,
      article: "FAKE article",
      url: "https://example.invalid/a",
    });
  });

  it("rejects a summary without attribution details", () => {
    expect(() => parseSummarySet({ ...FAKE_FILE, summaries: { "FAKE:a": { text: "FAKE text." } } })).toThrow();
  });
});

describe("createSummaryLoader", () => {
  it("is empty when nothing has been generated", async () => {
    expect((await createSummaryLoader(async () => null)()).summaries).toEqual({});
  });

  it("fetches the file once", async () => {
    let calls = 0;
    const load = createSummaryLoader(async () => {
      calls++;
      return FAKE_FILE;
    });
    await Promise.all([load(), load()]);
    await load();
    expect(calls).toBe(1);
  });

  it("retries after a failed load", async () => {
    let fail = true;
    const load = createSummaryLoader(async () => {
      if (fail) throw new Error("FAKE network error");
      return FAKE_FILE;
    });
    await expect(load()).rejects.toThrow();
    fail = false;
    expect(Object.keys((await load()).summaries)).toEqual(["FAKE:a"]);
  });
});
