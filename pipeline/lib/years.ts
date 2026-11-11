/**
 * Cliopatria records years as integers, "negative for BCE, positive for CE"
 * (its README). In the data, -N is the label "N BCE": the maps are sampled at
 * round BCE years (-1300, -1240, -1200) and the earliest row is -3400, matching
 * the dataset's stated start of 3400 BCE.
 *
 * The app uses astronomical numbering (1 BCE = 0), so BCE years shift by one.
 *
 * Cliopatria also uses a year 0, which does not exist in the BCE/CE calendar:
 * six rows end at 0 and their successors start at 1. We map 0 onto 1 BCE
 * (astronomical 0) so those ranges stay contiguous.
 *
 * ASSUMPTION: the authors' documentation does not state the year-0 convention.
 * See /docs/sources.md.
 */
export function cliopatriaYearToAstronomical(year: number): number {
  if (!Number.isInteger(year)) throw new Error(`Cliopatria year is not an integer: ${year}`);
  return year < 0 ? year + 1 : year;
}
