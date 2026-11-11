/**
 * Tick marks for the timeline ruler.
 *
 * Ticks sit where the *displayed* year is a round number, not where the
 * astronomical year is. 100 BCE is astronomical -99, so a tick every 100 years
 * falls on -99, -199, ... on the BCE side and 100, 200, ... on the CE side.
 */

const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000] as const;

const MINOR_STEP: Record<number, number> = {
  1: 0,
  2: 1,
  5: 1,
  10: 2,
  20: 5,
  50: 10,
  100: 20,
  200: 50,
  500: 100,
  1000: 200,
};

/** Smallest round step (in years) whose labels are at least `minLabelPx` apart. */
export function pickTickStep(pxPerYear: number, minLabelPx = 90): number {
  for (const step of STEPS) {
    if (step * pxPerYear >= minLabelPx) return step;
  }
  return STEPS[STEPS.length - 1] as number;
}

/** Step for the small unlabelled ticks between labels. 0 means none. */
export function minorTickStep(step: number): number {
  return MINOR_STEP[step] ?? 0;
}

/**
 * Astronomical years in [from, to] whose displayed number (the N in "N BCE" or
 * "N CE") is a multiple of `step`. Ascending.
 */
export function yearsAtMultiples(from: number, to: number, step: number): number[] {
  if (step <= 0 || from > to) return [];
  const years: number[] = [];

  // BCE side: displayed number d = 1 - year, for year <= 0.
  const bceTo = Math.min(Math.floor(to), 0);
  const bceFrom = Math.ceil(from);
  if (bceFrom <= bceTo) {
    const dMax = 1 - bceFrom;
    const dMin = 1 - bceTo;
    for (let d = Math.floor(dMax / step) * step; d >= dMin && d >= 1; d -= step) {
      years.push(1 - d);
    }
  }

  // CE side: displayed number equals the year, for year >= 1.
  const ceFrom = Math.max(Math.ceil(from), 1);
  for (let y = Math.ceil(ceFrom / step) * step; y <= to; y += step) {
    years.push(y);
  }

  return years;
}

/**
 * Labelled ticks: round years, plus 1 CE so the start of the era is always
 * marked (it is not a multiple of any step above 1).
 */
export function labelledTickYears(from: number, to: number, step: number): number[] {
  const years = yearsAtMultiples(from, to, step);
  if (step > 1 && from <= 1 && to >= 1) {
    years.push(1);
    years.sort((a, b) => a - b);
  }
  return years;
}
