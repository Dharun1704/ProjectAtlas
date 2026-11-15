import { describe, expect, it } from "vitest";
import { buildSummaries } from "./summaries";
import type { RawIntros } from "./summaries";

// Made-up polities and article text. Not real history.
const FAKE_POLITIES = {
  "FAKE:b": { wikipedia: "FAKE redirect" },
  "FAKE:a": { wikipedia: "FAKE article" },
  "FAKE:nolink": {},
  "FAKE:missing": { wikipedia: "FAKE gone" },
  "FAKE:empty": { wikipedia: "FAKE blank" },
  "FAKE:ambiguous": { wikipedia: "FAKE many" },
};

const FAKE_INTROS: RawIntros = {
  "FAKE article": { title: "FAKE article", pageid: 1, revision: 11, url: "https://example.invalid/a", extract: "One. Two. Three. Four." },
  "FAKE redirect": { title: "FAKE target", pageid: 2, revision: 22, url: "https://example.invalid/t", extract: "Only one." },
  "FAKE gone": { missing: true },
  "FAKE many": { title: "FAKE many", pageid: 4, revision: 44, url: "https://example.invalid/m", extract: "FAKE many may refer to:", disambiguation: true },
  "FAKE blank": { title: "FAKE blank", pageid: 3, revision: 33, url: "https://example.invalid/b", extract: "   " },
};

describe("buildSummaries", () => {
  const summaries = buildSummaries(FAKE_POLITIES, FAKE_INTROS);

  it("shortens the lead and records where it came from", () => {
    expect(summaries["FAKE:a"]).toEqual({
      text: "One. Two. Three.",
      shortened: true,
      article: "FAKE article",
      url: "https://example.invalid/a",
      revision: 11,
    });
  });

  it("credits the article a redirect leads to", () => {
    expect(summaries["FAKE:b"]).toMatchObject({ text: "Only one.", shortened: false, article: "FAKE target" });
  });

  it("gives no summary, instead of an invented one, when there is no link, no article, no lead or only a disambiguation page", () => {
    expect(Object.keys(summaries)).toEqual(["FAKE:a", "FAKE:b"]);
  });
});
