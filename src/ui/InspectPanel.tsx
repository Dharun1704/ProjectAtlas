import { wikidataUrl, wikipediaUrl } from "../data/links";
import { useAtlasStore } from "../store/store";
import { formatYear, formatYearRange } from "../time/year";

const CONFIDENCE_NOTE = {
  high: "High: well documented.",
  medium: "Medium: the source gives no per-border confidence, and shows only one version of past borders.",
  low: "Low: contested or poorly documented.",
} as const;

/** Details for the clicked item: name, dates, summary, sources and confidence. */
export function InspectPanel() {
  const selection = useAtlasStore((s) => s.selection);
  const year = useAtlasStore((s) => s.year);
  const setSelection = useAtlasStore((s) => s.setSelection);

  if (!selection) return null;

  const wikidata = selection.wikidataId ? wikidataUrl(selection.wikidataId) : null;

  return (
    <aside className="inspect" aria-label="Details">
      <button type="button" className="inspect__close" aria-label="Close details" onClick={() => setSelection(null)}>
        ×
      </button>
      <h2 className="inspect__name">{selection.name}</h2>

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
            ? `No borders for ${formatYear(year)}.`
            : selection.shown.start === selection.shown.end
              ? `Borders as of ${formatYear(selection.shown.start)}.`
              : `Valid ${formatYearRange(selection.shown.start, selection.shown.end)}.`}
        </dd>
        <dt>Confidence</dt>
        <dd>{CONFIDENCE_NOTE[selection.confidence]}</dd>
      </dl>

      <p className="inspect__missing">No summary yet.</p>

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
