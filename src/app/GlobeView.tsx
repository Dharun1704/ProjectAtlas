import { useEffect, useRef } from "react";
import { borderLoader } from "../data/borders";
import type { BorderChunk, BorderPolityRecord } from "../data/borders";
import { loadLand } from "../data/land";
import type { LandData } from "../data/land";
import type { BorderSnapshot, SourceRef } from "../data/types";
import { politySelection } from "../features/inspect/selection";
import { MapLibreRenderer } from "../globe/MapLibreRenderer";
import type { ClickHit, Renderer } from "../globe/Renderer";
import { GRATICULE_LAYER_ID, graticuleLayer } from "../globe/graticule";
import { BORDERS_LAYER_ID, bordersLayer, findActiveSnapshot, findSnapshotAtPoint } from "../layers/borders";
import { LAND_LAYER_ID, landLayer } from "../layers/land";
import { DARK_THEME, LIGHT_THEME } from "../layers/theme";
import { useAtlasStore } from "../store/store";
import type { Selection } from "../store/store";
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
    const theme = () => (useAtlasStore.getState().theme === "dark" ? DARK_THEME : LIGHT_THEME);

    let cancelled = false;
    let ready = false;
    let unsubscribe: (() => void) | undefined;
    let wantedChunk: number | null = null;
    let chunkPending = false;
    let rendererBusy = false;
    const publishBusy = () => useAtlasStore.getState().setGlobeBusy(chunkPending || rendererBusy);
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

    const buildSelection = (
      snapshot: BorderSnapshot,
      location: [number, number],
      switchedFrom?: Selection["switchedFrom"],
    ): Selection | null =>
      politySelection(
        snapshot,
        location,
        chunk?.polities[snapshot.polityId],
        polities[snapshot.polityId],
        switchedFrom,
      );

    /**
     * Keeps the inspect panel in step with the year. While the selected polity
     * is mapped, only its "borders shown" range changes. Once it is no longer
     * mapped, the panel switches to whatever the dataset shows at the clicked spot.
     */
    const refreshSelection = (year: number) => {
      const { selection, setSelection } = useAtlasStore.getState();
      if (!selection || !chunk || chunk.chunkStart !== chunkStart(year)) return;

      const own = findActiveSnapshot(chunk.snapshots, selection.polityId, year);
      if (own) {
        if (own.start !== selection.shown?.start || own.end !== selection.shown?.end) {
          setSelection({ ...selection, shown: { start: own.start, end: own.end } });
        }
        return;
      }

      const here = findSnapshotAtPoint(chunk.snapshots, selection.location, year);
      const next = here ? buildSelection(here, selection.location, { name: selection.name, year }) : null;
      if (next) setSelection(next);
      else if (selection.shown !== null) setSelection({ ...selection, shown: null });
    };

    const showBordersFor = (year: number) => {
      const wanted = chunkStart(year);
      if (wanted === wantedChunk) return;
      wantedChunk = wanted;
      chunkPending = true;
      publishBusy();

      borderLoader
        .loadChunk(wanted)
        .then((data) => {
          if (cancelled || wantedChunk !== wanted) return;
          chunk = data;
          drawBorders();
          chunkPending = false;
          publishBusy();
          onBorderCount(data.snapshots.length);
          refreshSelection(useAtlasStore.getState().year);
        })
        .catch((error: unknown) => {
          console.error("Could not load borders", error);
          if (cancelled || wantedChunk !== wanted) return;
          onBorderCount(0);
          chunkPending = false;
          publishBusy();
        });

      // Warm the neighbouring centuries so crossing into them is quick.
      for (const neighbour of [wanted - 100, wanted + 100]) {
        borderLoader.loadChunk(neighbour).catch(() => undefined);
      }
    };

    const handleClick = (hit: ClickHit) => {
      const { setSelection, year } = useAtlasStore.getState();
      const polityId = hit.feature?.layerId === BORDERS_LAYER_ID ? hit.feature.properties.polityId : undefined;
      const snapshot =
        typeof polityId === "string" && chunk ? findActiveSnapshot(chunk.snapshots, polityId, year) : undefined;
      setSelection(snapshot ? buildSelection(snapshot, hit.location) : null);
    };

    void (async () => {
      await renderer.mount(container);
      if (cancelled) return;
      ready = true;
      renderer.onClick(handleClick);
      renderer.onBusyChange((busy) => {
        rendererBusy = busy;
        publishBusy();
      });
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
        if (s.selection?.polityId !== prev.selection?.polityId) {
          renderer.setHighlight(
            BORDERS_LAYER_ID,
            s.selection ? { property: "polityId", value: s.selection.polityId } : null,
          );
        }
        if (s.theme !== prev.theme) redrawAll();
        if (s.focus && s.focus !== prev.focus) renderer.flyTo(s.focus.location);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      renderer.destroy();
      useAtlasStore.getState().setGlobeBusy(false);
    };
  }, [onBorderCount, onLandSource]);

  return <div ref={containerRef} className="globe" />;
}
