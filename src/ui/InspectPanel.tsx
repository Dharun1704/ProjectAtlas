import { useEffect, useState } from "react";
import { wikidataUrl, wikipediaUrl } from "../data/links";
import { loadPolitySummaries } from "../data/summaries";
import type { SummarySet } from "../data/summaries";
import { useAtlasStore } from "../store/store";
import { formatYear, formatYearRange } from "../time/year";

const CONFIDENCE_NOTE = {
  high: "High: well documented.",
  medium: "Medium: the source gives no per-border confidence, and shows only one version of past borders.",
  low: "Low: contested or poorly documented.",
} as const;

const CONFIDENCE_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

const LICENSE_URLS: Record<string, string> = {
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};

/** Details for the clicked item: name, dates, summary, sources and confidence. */
export function InspectPanel() {
  const selection = useAtlasStore((s) => s.selection);
  const year = useAtlasStore((s) => s.year);
  const setSelection = useAtlasStore((s) => s.setSelection);

  // null = not loaded yet. Loaded the first time something is selected.
  const [summarySet, setSummarySet] = useState<SummarySet | null>(null);
  const hasSelection = selection !== null;
  useEffect(() => {
    if (!hasSelection || summarySet) return;
    let cancelled = false;
    loadPolitySummaries()
      .then((set) => {
        if (!cancelled) setSummarySet(set);
      })
      .catch((error: unknown) => console.error("Could not load summaries", error));
    return () => {
      cancelled = true;
    };
  }, [hasSelection, summarySet]);

  if (!selection) return null;

  const wikidata = selection.wikidataId ? wikidataUrl(selection.wikidataId) : null;
  const summary = summarySet?.summaries[selection.polityId];
  const license = summarySet?.source.license;
  const licenseUrl = license ? LICENSE_URLS[license] : undefined;

  return (
    <aside className="inspect" aria-label="Details">
      <button type="button" className="inspect__close" aria-label="Close details" onClick={() => setSelection(null)}>
        ×
      </button>
      <h2 className="inspect__name">{selection.name}</h2>
      <p className="inspect__meta">
        {selection.datasetRange && (
          <span className="pill">{formatYearRange(selection.datasetRange.start, selection.datasetRange.end)}</span>
        )}
        <span className={`pill pill--${selection.confidence}`}>
          <span className="pill__dot" />
          {CONFIDENCE_LABEL[selection.confidence]} confidence
        </span>
      </p>

      {selection.switchedFrom && (
        <p className="inspect__note" role="status">
          Now showing what is mapped at the spot you clicked: {selection.switchedFrom.name} is not mapped in{" "}
          {formatYear(selection.switchedFrom.year)}.
        </p>
      )}

      {summary ? (
        <>
          <p className="inspect__summary">{summary.text}</p>
          <p className="inspect__attribution">
            From the Wikipedia article{" "}
            <a href={summary.url} target="_blank" rel="noreferrer">
              {summary.article}
            </a>
            {license && (
              <>
                ,{" "}
                {licenseUrl ? (
                  <a href={licenseUrl} target="_blank" rel="noreferrer">
                    {license}
                  </a>
                ) : (
                  license
                )}
              </>
            )}
            {summary.shortened ? ", shortened." : "."}
          </p>
        </>
      ) : (
        <p className="inspect__missing">{summarySet ? "No summary available." : "Loading summary…"}</p>
      )}

      <dl className="inspect__facts">
        {selection.datasetRange && (
          <>
            <dt>Mapped in this dataset</dt>
            <dd>{formatYearRange(selection.datasetRange.start, selection.datasetRange.end)}</dd>
          </>
        )}
        <dt>Borders shown</dt>
        <dd>
          {selection.shown === null
            ? `Nothing is mapped here in ${formatYear(year)}.`
            : selection.shown.start === selection.shown.end
              ? `Borders as of ${formatYear(selection.shown.start)}.`
              : `Valid ${formatYearRange(selection.shown.start, selection.shown.end)}.`}
        </dd>
        <dt>Confidence</dt>
        <dd>{CONFIDENCE_NOTE[selection.confidence]}</dd>
      </dl>

      <h3 className="inspect__heading">Sources</h3>
      <ul className="inspect__sources">
        {selection.sources.map((source) => (
          <li key={source.title}>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.dataset ?? source.title}
              </a>
            ) : (
              (source.dataset ?? source.title)
            )}
            {source.license ? ` (${source.license})` : ""}
          </li>
        ))}
      </ul>

      {(selection.wikipedia || wikidata) && (
        <>
          <h3 className="inspect__heading">Read more</h3>
          <ul className="inspect__sources">
            {selection.wikipedia && (
              <li>
                <a href={wikipediaUrl(selection.wikipedia)} target="_blank" rel="noreferrer">
                  Wikipedia: {selection.wikipedia}
                </a>
              </li>
            )}
            {wikidata && (
              <li>
                <a href={wikidata} target="_blank" rel="noreferrer">
                  Wikidata: {selection.wikidataId}
                </a>
              </li>
            )}
          </ul>
        </>
      )}
    </aside>
  );
}
