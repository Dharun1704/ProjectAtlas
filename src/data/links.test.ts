import { describe, expect, it } from "vitest";
import { wikidataUrl, wikipediaUrl } from "./links";

describe("wikipediaUrl", () => {
  it("turns spaces into underscores", () => {
    expect(wikipediaUrl("FAKE Page Title")).toBe("https://en.wikipedia.org/wiki/FAKE_Page_Title");
  });

  it("escapes characters that would break the URL", () => {
    expect(wikipediaUrl("FAKE A/B?c#d")).toBe("https://en.wikipedia.org/wiki/FAKE_A%2FB%3Fc%23d");
  });

  it("keeps non-Latin letters readable to the server", () => {
    expect(wikipediaUrl("FAKE Kāśī")).toBe(`https://en.wikipedia.org/wiki/FAKE_${encodeURIComponent("Kāśī")}`);
  });
});

describe("wikidataUrl", () => {
  it("links a well-formed item id", () => {
    expect(wikidataUrl("Q42")).toBe("https://www.wikidata.org/wiki/Q42");
  });

  it("refuses anything that is not an item id", () => {
    expect(wikidataUrl("FAKE_Q1")).toBeNull();
    expect(wikidataUrl("")).toBeNull();
    expect(wikidataUrl("Q12/../x")).toBeNull();
  });
});
