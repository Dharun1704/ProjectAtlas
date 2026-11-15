import { useEffect, useMemo, useState } from "react";
import { borderLoader } from "../../data/borders";
import type { BorderChunk, BorderPolityRecord } from "../../data/borders";
import { loadPolityMeta } from "../../data/polityMeta";
import type { PolityMetaSet } from "../../data/polityMeta";
import { polityColor } from "../../layers/borders";
import { representativePoint } from "../../layers/geometry";
import { useAtlasStore } from "../../store/store";
import { chunkStart, formatYear } from "../../time/year";
import { politySelection } from "../inspect/selection";
import { buildMeanwhile } from "./meanwhile";
import type { MeanwhileEntry } from "./meanwhile";

/** How many polities a region shows before "Show all". */
const TOP = 5;

/** "What was happening everywhere at once": the polities mapped in the current year, by region. */
export function MeanwhilePanel() {
  const year = useAtlasStore((s) => s.year);
  const selectedId = useAtlasStore((s) => s.selection?.polityId);
  const setSelection = useAtlasStore((s) => s.setSelection);
  const focusOn = useAtlasStore((s) => s.focusOn);

  const [chunk, setChunk] = useState<BorderChunk | null>(null);
  const [polities, setPolities] = useState<Record<string, BorderPolityRecord>>({});
  const [meta, setMeta] = useState<PolityMetaSet | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    borderLoader.loadPolities().then((p) => !cancelled && setPolities(p), () => undefined);
    loadPolityMeta().then((m) => !cancelled && setMeta(m), () => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const wantedChunk = chunkStart(year);
  useEffect(() => {
    let cancelled = false;
    borderLoader.loadChunk(wantedChunk).then((c) => !cancelled && setChunk(c), () => undefined);
    return () => {
      cancelled = true;
    };
  }, [wantedChunk]);

  // While the next century loads, the previous one would give a wrong list.
  const ready = chunk !== null && chunk.chunkStart === wantedChunk && meta !== null;
  const groups = useMemo(
    () => (ready ? buildMeanwhile(chunk.snapshots, year, { ...chunk.polities, ...polities }, meta.polities) : []),
    [ready, chunk, year, polities, meta],
  );
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  const open = (entry: MeanwhileEntry) => {
    const location = representativePoint(entry.snapshot.geometry.coordinates);
    if (!location) return;
    setSelection(politySelection(entry.snapshot, location, chunk?.polities[entry.polityId], polities[entry.polityId]));
    focusOn(location);
  };

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <aside className="meanwhile" aria-label="Meanwhile">
      <h2 className="meanwhile__title">Meanwhile, in {formatYear(year)}</h2>
      <p className="meanwhile__count">
        {!ready ? "Loading…" : total === 0 ? "Nothing is mapped for this year." : `${total} polities mapped.`}
      </p>

      {groups.map((group) => {
        const key = group.region ?? "";
        const showAll = expanded.has(key);
        const shown = showAll ? group.entries : group.entries.slice(0, TOP);
        return (
          <section key={key} className="meanwhile__group">
            <h3 className="meanwhile__region">
              {group.region ?? "Region unknown"}
              <span className="meanwhile__region-count">{group.entries.length}</span>
            </h3>
            <ul className="meanwhile__list">
              {shown.map((entry) => (
                <li key={entry.polityId}>
                  <button
                    type="button"
                    className="meanwhile__entry"
                    aria-current={entry.polityId === selectedId ? "true" : undefined}
                    onClick={() => open(entry)}
                  >
                    <span className="meanwhile__dot" style={{ background: polityColor(entry.polityId) }} />
                    {entry.name}
                  </button>
                </li>
              ))}
            </ul>
            {group.entries.length > TOP && (
              <button type="button" className="meanwhile__more" onClick={() => toggle(key)}>
                {showAll ? "Show fewer" : `Show all ${group.entries.length}`}
              </button>
            )}
          </section>
        );
      })}

      <section className="meanwhile__group">
        <h3 className="meanwhile__region">Events</h3>
        <p className="meanwhile__missing">No event data yet.</p>
      </section>

      {ready && total > 0 && (
        <p className="meanwhile__note">
          Listed by how widely each is covered on Wikipedia
          {meta.sources.importance ? ` (${meta.sources.importance.dataset ?? meta.sources.importance.title})` : ""}.
          Regions are modern ones
          {meta.sources.region ? ` (${meta.sources.region.title})` : ""}, by where most of a polity lay at its
          largest.
        </p>
      )}
    </aside>
  );
}
