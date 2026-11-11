import { describe, expect, it } from "vitest";
import { formatYear } from "../../src/time/year";
import { cliopatriaYearToAstronomical } from "./years";

describe("cliopatriaYearToAstronomical", () => {
  it("leaves CE years unchanged", () => {
    expect(cliopatriaYearToAstronomical(1)).toBe(1);
    expect(cliopatriaYearToAstronomical(2024)).toBe(2024);
  });

  it("shifts BCE years by one, so -N displays as N BCE", () => {
    expect(cliopatriaYearToAstronomical(-1)).toBe(0);
    expect(cliopatriaYearToAstronomical(-3400)).toBe(-3399);
    expect(formatYear(cliopatriaYearToAstronomical(-3400))).toBe("3400 BCE");
    expect(formatYear(cliopatriaYearToAstronomical(-27))).toBe("27 BCE");
  });

  it("maps Cliopatria's year 0 onto 1 BCE", () => {
    expect(cliopatriaYearToAstronomical(0)).toBe(0);
    expect(formatYear(cliopatriaYearToAstronomical(0))).toBe("1 BCE");
  });

  it("keeps a range ending at 0 contiguous with one starting at 1", () => {
    const endOfFirst = cliopatriaYearToAstronomical(0);
    const startOfSecond = cliopatriaYearToAstronomical(1);
    expect(startOfSecond - endOfFirst).toBe(1);
  });

  it("never reorders years", () => {
    const years = [-3400, -100, -2, -1, 0, 1, 2, 100];
    const converted = years.map(cliopatriaYearToAstronomical);
    expect([...converted].sort((a, b) => a - b)).toEqual(converted);
  });

  it("rejects non-integer years", () => {
    expect(() => cliopatriaYearToAstronomical(1.5)).toThrow();
  });
});
