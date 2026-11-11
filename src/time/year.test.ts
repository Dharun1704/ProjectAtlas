import { describe, expect, it } from "vitest";
import { MAX_YEAR, MIN_YEAR, chunkStart, clampYear, formatYear, formatYearRange, isActiveInYear } from "./year";

describe("formatYear", () => {
  it("labels positive years as CE", () => {
    expect(formatYear(1)).toBe("1 CE");
    expect(formatYear(1492)).toBe("1492 CE");
    expect(formatYear(2025)).toBe("2025 CE");
  });

  it("labels year 0 as 1 BCE", () => {
    expect(formatYear(0)).toBe("1 BCE");
  });

  it("labels negative years one further back in BCE", () => {
    expect(formatYear(-1)).toBe("2 BCE");
    expect(formatYear(-499)).toBe("500 BCE");
    expect(formatYear(-3000)).toBe("3001 BCE");
  });

  it("has no gap or repeat across the BCE/CE boundary", () => {
    expect([-2, -1, 0, 1, 2].map(formatYear)).toEqual(["3 BCE", "2 BCE", "1 BCE", "1 CE", "2 CE"]);
  });

  it("never prints negative zero", () => {
    expect(formatYear(-0)).toBe("1 BCE");
  });
});

describe("clampYear", () => {
  it("keeps years inside the default range", () => {
    expect(clampYear(-99999)).toBe(MIN_YEAR);
    expect(clampYear(99999)).toBe(MAX_YEAR);
    expect(clampYear(0)).toBe(0);
  });

  it("rounds to whole years", () => {
    expect(clampYear(0.4)).toBe(0);
    expect(clampYear(-0.6)).toBe(-1);
    expect(clampYear(1066.5)).toBe(1067);
  });

  it("falls back to the minimum for NaN", () => {
    expect(clampYear(Number.NaN)).toBe(MIN_YEAR);
  });

  it("accepts a custom range", () => {
    expect(clampYear(50, 100, 200)).toBe(100);
  });
});

describe("isActiveInYear", () => {
  it("includes both ends of the range", () => {
    expect(isActiveInYear(-10, 10, -10)).toBe(true);
    expect(isActiveInYear(-10, 10, 10)).toBe(true);
    expect(isActiveInYear(-10, 10, 11)).toBe(false);
    expect(isActiveInYear(-10, 10, -11)).toBe(false);
  });

  it("handles a range spanning the BCE/CE boundary", () => {
    expect(isActiveInYear(-26, 14, 0)).toBe(true);
    expect(isActiveInYear(-26, 14, 1)).toBe(true);
  });

  it("handles a point-in-time range", () => {
    expect(isActiveInYear(1200, 1200, 1200)).toBe(true);
    expect(isActiveInYear(1200, 1200, 1201)).toBe(false);
  });
});

describe("chunkStart", () => {
  it("aligns to centuries for CE years", () => {
    expect(chunkStart(1)).toBe(0);
    expect(chunkStart(99)).toBe(0);
    expect(chunkStart(100)).toBe(100);
    expect(chunkStart(2025)).toBe(2000);
  });

  it("puts year 0 in the 0..99 chunk and -1 in the chunk before it", () => {
    expect(chunkStart(0)).toBe(0);
    expect(chunkStart(-1)).toBe(-100);
    expect(chunkStart(-100)).toBe(-100);
    expect(chunkStart(-101)).toBe(-200);
  });

  it("covers the start of the default range", () => {
    expect(chunkStart(MIN_YEAR)).toBe(-3000);
  });
});

describe("formatYearRange", () => {
  it("formats a range across the BCE/CE boundary", () => {
    expect(formatYearRange(-26, 14)).toBe("27 BCE – 14 CE");
  });

  it("shows one label for a single year", () => {
    expect(formatYearRange(1200, 1200)).toBe("1200 CE");
    expect(formatYearRange(0, 0)).toBe("1 BCE");
  });
});
