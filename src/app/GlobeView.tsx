import { useEffect, useRef } from "react";
import { borderLoader } from "../data/borders";
import type { BorderChunk, BorderPolityRecord } from "../data/borders";
import { loadLand } from "../data/land";
import type { LandData } from "../data/land";
import type { SourceRef } from "../data/types";
import { MapLibreRenderer } from "../globe/MapLibreRenderer";
import type { ClickHit, Renderer } from "../globe/Renderer";
import { GRATICULE_LAYER_ID, graticuleLayer } from "../globe/graticule";
import { BORDERS_LAYER_ID, bordersLayer, findActiveSnapshot } from "../layers/borders";
import { LAND_LAYER_ID, landLayer } from "../layers/land";
import { DARK_THEME, LIGHT_THEME } from "../layers/theme";
import { useAtlasStore } from "../store/store";
import { chunkStart } from "../time/year";

type Props = {
  /** Number of border snapshots in the century now shown; 0 means no data for it. */
  onBorderCount: (count: number) => void;
  /** Reports the source of the land backdrop once it has loaded. */
  onLandSource: (source: SourceRef) => void;
};

/**
 * Hosts the globe. Year changes go straight from the store to the renderer,
 * bypassing React rendering, so scrubbing stays cheap. Border data is loaded
 * one century at a time, in the background, and never blocks the slider.
 */
export function GlobeView({ onBorderCount, onLandSource }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer: Renderer = new MapLibreRenderer();
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const theme = () => (darkQuery.matches ? DARK_THEME : LIGHT_THEME);

    let cancelled = false;
    let ready = false;
    let unsubscribe: (() => void) | undefined;
    let wantedChunk: number | null = null;
    let chunk: BorderChunk | null = null;
    let land: LandData | null = null;
    let polities: Record<string, BorderPolityRecord> = {};

    const drawBorders = () => {
      if (!chunk) return;
      renderer.setLayer(bordersLayer(chunk.snapshots, theme()));
      renderer.setLayerVisible(BORDERS_LAYER_ID, useAtlasStore.getState().activeLayers.borders);
    };

    /** Draws every layer from scratch in the current theme. */
    const redrawAll = () => {
      if (!ready) return;
      const t = theme();
      renderer.setBaseColor(t.sea);
      for (const id of [LAND_LAYER_ID, BORDERS_LAYER_ID, GRATICULE_LAYER_ID]) renderer.removeLayer(id);
      if (land) renderer.setLayer(landLayer(land.geometry, t));
      drawBorders();
      renderer.setLayer(graticuleLayer(t.grid, t.gridOpacity));
    };

    /** Keeps the inspect panel's "borders shown" in step with the year. */
    const refreshSelection = (year: number) => {
      const { selection, setSelection } = useAtlasStore.getState();
      if (!selection || !chunk || chunk.chunkStart !== chunkStart(year)) return;
      const active = findActiveSnapshot(chunk.snapshots, selection.polityId, year);
      const shown = active ? { start: active.start, end: active.end } : null;
      if (shown?.start !== selection.shown?.start || shown?.end !== selection.shown?.end) {
        setSelection({ ...selection, shown });
      }
    };

    const showBordersFor = (year: number) => {
      const wanted = chunkStart(year);
      if (wanted === wantedChunk) return;
      wantedChunk = wanted;

      borderLoader
        .loadChunk(wanted)
        .then((data) => {
          if (cancelled || wantedChunk !== wanted) return;
          chunk = data;
          drawBorders();
          onBorderCount(data.snapshots.length);
          refreshSelection(useAtlasStore.getState().year);
        })
        .catch((error: unknown) => {
          console.error("Could not load borders", error);
          if (!cancelled && wantedChunk === wanted) onBorderCount(0);
        });

      // Warm the neighbouring centuries so crossing into them is quick.
      for (const neighbour of [wanted - 100, wanted + 100]) {
        borderLoader.loadChunk(neighbour).catch(() => undefined);
      }
    };

    const handleClick = (hit: ClickHit) => {
      const { setSelection, year } = useAtlasStore.getState();
      const polityId = hit?.layerId === BORDERS_LAYER_ID ? hit.properties.polityId : undefined;
      if (typeof polityId !== "string" || !chunk) {
        setSelection(null);
        return;
      }
      const active = findActiveSnapshot(chunk.snapshots, polityId, year);
      const info = polities[polityId] ?? chunk.polities[polityId];
      if (!active || !info) {
        setSelection(null);
        return;
      }
      const record = polities[polityId];
      setSelection({
        kind: "polity",
        polityId,
        name: info.name,
        ...(info.wikidataId ? { wikidataId: info.wikidataId } : {}),
        ...(info.wikipedia ? { wikipedia: info.wikipedia } : {}),
        ...(record ? { datasetRange: { start: record.start, end: record.end } } : {}),
        shown: { start: active.start, end: active.end },
        confidence: active.confidence,
        sources: active.sources,
      });
    };

    const onThemeChange = () => redrawAll();
    darkQuery.addEventListener("change", onThemeChange);

    void (async () => {
      await renderer.mount(container);
      if (cancelled) return;
      ready = true;
      renderer.onClick(handleClick);
      redrawAll();

      const state = useAtlasStore.getState();
      renderer.setYear(state.year);
      showBordersFor(state.year);

      loadLand()
        .then((data) => {
          if (cancelled || !data) return;
          land = data;
          renderer.setLayer(landLayer(data.geometry, theme()));
          onLandSource(data.source);
        })
        .catch((error: unknown) => console.error("Could not load land", error));

      borderLoader
        .loadPolities()
        .then((records) => {
          if (!cancelled) polities = records;
        })
        .catch((error: unknown) => console.error("Could not load polities", error));

      unsubscribe = useAtlasStore.subscribe((s, prev) => {
        if (s.year !== prev.year) {
          renderer.setYear(s.year);
          showBordersFor(s.year);
          refreshSelection(s.year);
        }
        if (s.activeLayers.borders !== prev.activeLayers.borders) {
          renderer.setLayerVisible(BORDERS_LAYER_ID, s.activeLayers.borders);
        }
      });
    })();

    return () => {
      cancelled = true;
      darkQuery.removeEventListener("change", onThemeChange);
      unsubscribe?.();
      renderer.destroy();
    };
  }, [onBorderCount, onLandSource]);

  return <div ref={containerRef} className="globe" />;
}
