import { useEffect, useState } from "react";
import { borderLoader } from "../data/borders";
import type { SourceRef } from "../data/types";
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
      <header className="title">History Atlas</header>

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

      <InspectPanel />

      <footer className="controls">
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
