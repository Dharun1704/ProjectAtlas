import type { PolityMeta } from "../../data/polityMeta";
import type { BorderSnapshot } from "../../data/types";
import { isActiveInYear } from "../../time/year";

export type MeanwhileEntry = {
  polityId: string;
  name: string;
  /** Wikidata sitelink count; missing when unknown. */
  importance?: number;
  /** The polity's borders in the chosen year. */
  snapshot: BorderSnapshot;
};

export type MeanwhileGroup = {
  /** Null for polities whose region is unknown. */
  region: string | null;
  continent: string | null;
  /** Most important first. */
  entries: MeanwhileEntry[];
};

/**
 * Everything mapped in `year`, grouped by region. Within a region the most
 * important polities come first; those with no importance go last, by name.
 * Regions are ordered by continent, then name, with unknown regions at the end.
 */
export function buildMeanwhile(
  snapshots: readonly BorderSnapshot[],
  year: number,
  names: Readonly<Record<string, { name: string }>>,
  meta: Readonly<Record<string, PolityMeta>>,
): MeanwhileGroup[] {
  const groups = new Map<string, MeanwhileGroup>();
  const seen = new Set<string>();

  for (const snapshot of snapshots) {
    if (seen.has(snapshot.polityId) || !isActiveInYear(snapshot.start, snapshot.end, year)) continue;
    seen.add(snapshot.polityId);

    const m = meta[snapshot.polityId];
    const region = m?.region ?? null;
    const key = region ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { region, continent: region ? (m?.continent ?? null) : null, entries: [] };
      groups.set(key, group);
    }
    group.entries.push({
      polityId: snapshot.polityId,
      // A polity missing from the name list still appears, under its id, rather than vanishing.
      name: names[snapshot.polityId]?.name ?? snapshot.polityId,
      ...(m?.importance !== undefined ? { importance: m.importance } : {}),
      snapshot,
    });
  }

  for (const group of groups.values()) {
    group.entries.sort(
      (a, b) => (b.importance ?? -1) - (a.importance ?? -1) || a.name.localeCompare(b.name, "en"),
    );
  }

  return [...groups.values()].sort((a, b) => {
    if ((a.region === null) !== (b.region === null)) return a.region === null ? 1 : -1;
    return (
      (a.continent ?? "").localeCompare(b.continent ?? "", "en") || (a.region ?? "").localeCompare(b.region ?? "", "en")
    );
  });
}
