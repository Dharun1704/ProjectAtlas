import type { BorderPolityInfo, BorderPolityRecord } from "../../data/borders";
import type { BorderSnapshot } from "../../data/types";
import type { Selection } from "../../store/store";

/**
 * Builds the inspect-panel selection for a polity's borders.
 * `info` is whatever is known about the polity; `record`, when available, adds
 * the years the dataset maps it. Returns null when the polity is unknown.
 */
export function politySelection(
  snapshot: BorderSnapshot,
  location: [lon: number, lat: number],
  info: BorderPolityInfo | undefined,
  record: BorderPolityRecord | undefined,
  switchedFrom?: Selection["switchedFrom"],
): Selection | null {
  const known = record ?? info;
  if (!known) return null;
  return {
    kind: "polity",
    polityId: snapshot.polityId,
    name: known.name,
    ...(known.wikidataId ? { wikidataId: known.wikidataId } : {}),
    ...(known.wikipedia ? { wikipedia: known.wikipedia } : {}),
    location,
    ...(record ? { datasetRange: { start: record.start, end: record.end } } : {}),
    shown: { start: snapshot.start, end: snapshot.end },
    ...(switchedFrom ? { switchedFrom } : {}),
    confidence: snapshot.confidence,
    sources: snapshot.sources,
  };
}
