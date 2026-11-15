import { useEffect, useState } from "react";
import { borderLoader } from "../data/borders";
import type { SourceRef } from "../data/types";
import { MeanwhilePanel } from "../features/meanwhile/MeanwhilePanel";
import { useAtlasStore } from "../store/store";
import { MAX_YEAR, MIN_YEAR, formatYear } from "../time/year";
import { InspectPanel } from "../ui/InspectPanel";
import { TimeSlider } from "../ui/TimeSlider";
import { GlobeView } from "./GlobeView";

const LICENSE_URLS: Record<string, string> = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
};

function SourceLink({ source }: { source: SourceRef }) {
  const label = source.dataset ?? source.title;
  return source.url ? (
    <a href={source.url} target="_blank" rel="noreferrer">
      {label}
    </a>
  ) : (
    <>{label}</>
  );
}

export function App() {
  // null = still loading, 0 = no border data for the century being shown.
  const [borderCount, setBorderCount] = useState<number | null>(null);
  const [borderSource, setBorderSource] = useState<SourceRef | null>(null);
  const [landSource, setLandSource] = useState<SourceRef | null>(null);

  const globeBusy = useAtlasStore((s) => s.globeBusy);
  const meanwhileOpen = useAtlasStore((s) => s.meanwhileOpen);
  const toggleMeanwhile = useAtlasStore((s) => s.toggleMeanwhile);
  const theme = useAtlasStore((s) => s.theme);
  const setTheme = useAtlasStore((s) => s.setTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // True on the last year of the timeline, when the data (not the default range) sets that end.
  const dataEndYear = useAtlasStore((s) => (s.maxYear < MAX_YEAR && s.year >= s.maxYear ? s.maxYear : null));

  useEffect(() => {
    let cancelled = false;
    borderLoader
      .loadIndex()
      .then((index) => {
        if (cancelled || !index) return;
        setBorderSource(index.source);
        // Borders are the only data so far, so the timeline stops where they stop.
        // A year past the data would show an empty globe.
        useAtlasStore.getState().setYearRange(MIN_YEAR, Math.min(MAX_YEAR, index.maxYear));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const licenseUrl = borderSource?.license ? LICENSE_URLS[borderSource.license] : undefined;

  return (
    <div className="app">
      <GlobeView onBorderCount={setBorderCount} onLandSource={setLandSource} />
      <header className="topbar">
        <span className="title">History Atlas</span>
        <button type="button" className="chip" aria-pressed={meanwhileOpen} onClick={toggleMeanwhile}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
          </svg>
          Meanwhile
        </button>
        <button
          type="button"
          className="chip chip--icon"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
            </svg>
          )}
        </button>
      </header>

      <div className="notices">
        {borderCount === 0 && (
          <p className="notice" role="status">
            No border data for this period.
          </p>
        )}
        {dataEndYear !== null && (
          <p className="notice" role="status">
            The border data ends in {formatYear(dataEndYear)}, so the timeline stops here. Later years are left out
            rather than guessed.
          </p>
        )}
      </div>

      {meanwhileOpen && <MeanwhilePanel />}
      <InspectPanel />

      <footer className="controls">
        <div className="busy-line" data-busy={globeBusy} role="status">
          {globeBusy && <span className="visually-hidden">Updating the map</span>}
        </div>
        <TimeSlider />
        {(borderSource || landSource) && (
          <p className="credit">
            {borderSource && (
              <>
                Borders: <SourceLink source={borderSource} />
                {borderSource.license && (
                  <>
                    ,{" "}
                    {licenseUrl ? (
                      <a href={licenseUrl} target="_blank" rel="noreferrer">
                        {borderSource.license}
                      </a>
                    ) : (
                      borderSource.license
                    )}
                  </>
                )}
                , simplified. One version of past borders; all are approximate.{" "}
              </>
            )}
            {landSource && (
              <>
                Coastlines are modern: <SourceLink source={landSource} />.
              </>
            )}
          </p>
        )}
      </footer>
    </div>
  );
}
