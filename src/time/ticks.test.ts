import { describe, expect, it } from "vitest";
import { labelledTickYears, minorTickStep, pickTickStep, yearsAtMultiples } from "./ticks";
import { formatYear } from "./year";

describe("pickTickStep", () => {
  it("uses single years when zoomed far in", () => {
    expect(pickTickStep(100)).toBe(1);
  });

  it("uses centuries at about one pixel per year", () => {
    expect(pickTickStep(1)).toBe(100);
  });

  it("uses the largest step when zoomed far out", () => {
    expect(pickTickStep(0.01)).toBe(1000);
  });

  it("always keeps labels at least the minimum distance apart, when a step allows it", () => {
    for (const pxPerYear of [0.1, 0.3, 1, 2.5, 7, 20, 45]) {
      expect(pickTickStep(pxPerYear, 90) * pxPerYear).toBeGreaterThanOrEqual(90);
    }
  });
});

describe("minorTickStep", () => {
  it("divides each labelled step evenly", () => {
    for (const step of [2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
      const minor = minorTickStep(step);
      expect(minor).toBeGreaterThan(0);
      expect(step % minor).toBe(0);
    }
  });

  it("has no minor ticks between single years", () => {
    expect(minorTickStep(1)).toBe(0);
  });
});

describe("yearsAtMultiples", () => {
  it("puts BCE ticks on round displayed years, not round astronomical years", () => {
    const years = yearsAtMultiples(-350, -50, 100);
    expect(years).toEqual([-299, -199, -99]);
    expect(years.map(formatYear)).toEqual(["300 BCE", "200 BCE", "100 BCE"]);
  });

  it("puts CE ticks on round years", () => {
    expect(yearsAtMultiples(50, 350, 100)).toEqual([100, 200, 300]);
  });

  it("crosses the BCE/CE boundary in order, with no tick at a year that has no round label", () => {
    const years = yearsAtMultiples(-250, 250, 100);
    expect(years.map(formatYear)).toEqual(["200 BCE", "100 BCE", "100 CE", "200 CE"]);
  });

  it("returns every year at step 1, including 1 BCE and 1 CE", () => {
    expect(yearsAtMultiples(-2, 2, 1).map(formatYear)).toEqual(["3 BCE", "2 BCE", "1 BCE", "1 CE", "2 CE"]);
  });

  it("includes both ends of the range", () => {
    expect(yearsAtMultiples(-99, 100, 100)).toEqual([-99, 100]);
  });

  it("handles fractional bounds", () => {
    expect(yearsAtMultiples(-99.5, 100.5, 100)).toEqual([-99, 100]);
    expect(yearsAtMultiples(-98.5, 99.5, 100)).toEqual([]);
  });

  it("returns nothing for an empty range or a bad step", () => {
    expect(yearsAtMultiples(10, 5, 1)).toEqual([]);
    expect(yearsAtMultiples(0, 10, 0)).toEqual([]);
  });
});

describe("labelledTickYears", () => {
  it("adds 1 CE between the last BCE label and the first CE label", () => {
    expect(labelledTickYears(-250, 250, 100).map(formatYear)).toEqual([
      "200 BCE",
      "100 BCE",
      "1 CE",
      "100 CE",
      "200 CE",
    ]);
  });

  it("does not add 1 CE twice at step 1", () => {
    expect(labelledTickYears(0, 2, 1)).toEqual([0, 1, 2]);
  });

  it("does not add 1 CE when it is out of range", () => {
    expect(labelledTickYears(500, 800, 100)).toEqual([500, 600, 700, 800]);
  });
});
