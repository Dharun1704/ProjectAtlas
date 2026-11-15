import { describe, expect, it } from "vitest";
import { shortenSummary, splitSentences } from "./summary";

// Made-up text. Not real history.
describe("splitSentences", () => {
  it("splits on sentence ends", () => {
    expect(splitSentences("FAKE one. FAKE two! FAKE three? FAKE four.")).toEqual([
      "FAKE one.",
      "FAKE two!",
      "FAKE three?",
      "FAKE four.",
    ]);
  });

  it("does not split after common abbreviations or initials", () => {
    expect(splitSentences("It began c. 500 under St. Fake. It ended later.")).toEqual([
      "It began c. 500 under St. Fake.",
      "It ended later.",
    ]);
    expect(splitSentences("Written by J. R. Fake. It is long.")).toEqual(["Written by J. R. Fake.", "It is long."]);
  });

  it("does not split inside decimal numbers", () => {
    expect(splitSentences("It covered 3.5 million units. Then it shrank.")).toEqual([
      "It covered 3.5 million units.",
      "Then it shrank.",
    ]);
  });

  it("keeps closing quotes and brackets with their sentence", () => {
    expect(splitSentences('It was called "the Fake." Then it fell.')).toEqual(['It was called "the Fake."', "Then it fell."]);
  });

  it("collapses line breaks and extra spaces", () => {
    expect(splitSentences("FAKE one.\n\nFAKE   two.")).toEqual(["FAKE one.", "FAKE two."]);
  });

  it("removes the empty brackets Wikipedia leaves where a pronunciation was", () => {
    expect(splitSentences("The FAKE Empire (), also called FAKE ( ), was a state.")).toEqual([
      "The FAKE Empire, also called FAKE, was a state.",
    ]);
  });

  it("returns nothing for empty text", () => {
    expect(splitSentences("  \n ")).toEqual([]);
  });
});

describe("shortenSummary", () => {
  it("keeps at most three sentences and reports that it shortened", () => {
    expect(shortenSummary("A one. B two. C three. D four.")).toEqual({ text: "A one. B two. C three.", shortened: true });
  });

  it("reports no shortening when everything fits", () => {
    expect(shortenSummary("A one. B two.")).toEqual({ text: "A one. B two.", shortened: false });
  });

  it("stops before the character limit, at a sentence end", () => {
    const result = shortenSummary("Short first. X" + "x".repeat(60) + ". Third.", 3, 40);
    expect(result).toEqual({ text: "Short first.", shortened: true });
  });

  it("always keeps the first sentence whole, even when it is over the limit", () => {
    const long = "y".repeat(100) + ".";
    expect(shortenSummary(`${long} Second.`, 3, 40)).toEqual({ text: long, shortened: true });
  });

  it("never changes the words it keeps", () => {
    const source = "The FAKE realm (c. 1–2) was a state. It had a capital. It fell. More text.";
    expect(source.startsWith(shortenSummary(source).text)).toBe(true);
  });

  it("returns empty text for an empty lead", () => {
    expect(shortenSummary("")).toEqual({ text: "", shortened: false });
  });
});
