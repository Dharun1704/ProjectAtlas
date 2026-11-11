/**
 * Year model. Years are integers in astronomical year numbering:
 * 1 CE = 1, 1 BCE = 0, 2 BCE = -1, 500 BCE = -499. There is a year 0.
 *
 * All time math for the app lives in /src/time.
 */

export const MIN_YEAR = -3000;
export const MAX_YEAR = 2025;

/**
 * The only place an astronomical year becomes a BCE/CE label.
 * formatYear(0) === "1 BCE", formatYear(-499) === "500 BCE", formatYear(1) === "1 CE".
 */
export function formatYear(year: number): string {
  const y = Math.trunc(year);
  return y <= 0 ? `${1 - y} BCE` : `${y} CE`;
}

/** Rounds to a whole year and keeps it inside [min, max]. */
export function clampYear(year: number, min: number = MIN_YEAR, max: number = MAX_YEAR): number {
  if (Number.isNaN(year)) return min;
  return Math.min(max, Math.max(min, Math.round(year)));
}

/** True when `year` falls inside the inclusive range [start, end]. */
export function isActiveInYear(start: number, end: number, year: number): boolean {
  return start <= year && year <= end;
}

/**
 * First year of the 100-year data chunk containing `year`.
 * Chunks are aligned to multiples of 100 in astronomical years:
 * -100..-1, 0..99, 100..199. Year 0 (1 BCE) starts the chunk 0..99.
 */
export function chunkStart(year: number): number {
  return Math.floor(Math.trunc(year) / 100) * 100;
}

/** "27 BCE – 14 CE", or a single label when both ends are the same year. */
export function formatYearRange(start: number, end: number): string {
  return start === end ? formatYear(start) : `${formatYear(start)} – ${formatYear(end)}`;
}
