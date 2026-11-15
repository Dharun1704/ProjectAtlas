import { Map as MlMap, setWorkerUrl } from "maplibre-gl";
import type { FilterSpecification, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Vite bundles MapLibre's worker and hands back its URL; without this the
// worker 404s and no layer data is ever drawn.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { ClickHit, LayerSpec, PolygonLayerSpec, Renderer } from "./Renderer";

setWorkerUrl(workerUrl);

const BASE_LAYER_ID = "base";
const HIGHLIGHT_SUFFIX = "-highlight";

/** MapLibre GL implementation of Renderer. Nothing outside /src/globe imports MapLibre. */
export class MapLibreRenderer implements Renderer {
  private map: MlMap | null = null;
  private year = 0;
  /** Spec id -> ids of the MapLibre layers drawn for it. */
  private readonly drawn = new Map<string, string[]>();
  private readonly zOf = new Map<string, number>();
  private readonly timeFiltered = new Set<string>();
  /** MapLibre fill layer id -> spec id, for clickable layers. */
  private readonly clickable = new Map<string, string>();
  private clickHandler: ((hit: ClickHit) => void) | null = null;
  private busyHandler: ((busy: boolean) => void) | null = null;
  private busy = false;
  /** Spec id -> what to outline. Kept when the layer is removed, so a redraw restores it. */
  private readonly highlights = new Map<string, { property: string; value: string }>();

  mount(container: HTMLElement): Promise<void> {
    const map = new MlMap({
      container,
      style: {
        version: 8,
        projection: { type: "globe" },
        sources: {},
        layers: [{ id: BASE_LAYER_ID, type: "background", paint: { "background-color": "#000000" } }],
      },
      center: [20, 25],
      zoom: 1.6,
      attributionControl: false,
    });
    this.map = map;

    // "idle" fires once every tile is loaded and every pending change has been drawn.
    map.on("idle", () => this.setBusy(false));

    map.on("click", (e) => {
      if (!this.clickHandler) return;
      const layers = [...this.clickable.keys()].filter((id) => map.getLayer(id));
      const feature = layers.length > 0 ? map.queryRenderedFeatures(e.point, { layers })[0] : undefined;
      const specId = feature ? this.clickable.get(feature.layer.id) : undefined;
      this.clickHandler({
        location: [e.lngLat.lng, e.lngLat.lat],
        feature: feature && specId ? { layerId: specId, properties: feature.properties } : null,
      });
    });

    return new Promise((resolve) => {
      map.once("load", () => resolve());
    });
  }

  setBaseColor(color: string): void {
    this.map?.setPaintProperty(BASE_LAYER_ID, "background-color", color);
  }

  setLayer(spec: LayerSpec): void {
    const map = this.map;
    if (!map) return;
    this.setBusy(true);

    const source = map.getSource<GeoJSONSource>(spec.id);
    if (source) {
      source.setData(spec.data);
      // Same layer, new data (e.g. the next century's borders): keep the drawn
      // layers so nothing flickers.
      if (this.drawn.has(spec.id)) return;
    } else {
      map.addSource(spec.id, { type: "geojson", data: spec.data });
    }

    const before = this.layerAbove(spec.z);
    this.zOf.set(spec.id, spec.z);

    if (spec.kind === "lines") {
      map.addLayer(
        {
          id: spec.id,
          type: "line",
          source: spec.id,
          paint: {
            "line-color": spec.style.color,
            "line-width": spec.style.width,
            "line-opacity": spec.style.opacity,
          },
        },
        before,
      );
      this.drawn.set(spec.id, [spec.id]);
      return;
    }

    this.addPolygonLayers(map, spec, before);
  }

  /** First MapLibre layer of the lowest spec that should sit above `z`. */
  private layerAbove(z: number): string | undefined {
    let best: { z: number; layerId: string } | undefined;
    for (const [specId, specZ] of this.zOf) {
      const first = this.drawn.get(specId)?.[0];
      if (first && specZ > z && (!best || specZ < best.z)) best = { z: specZ, layerId: first };
    }
    return best?.layerId;
  }

  private addPolygonLayers(map: MlMap, spec: PolygonLayerSpec, before: string | undefined): void {
    const fillId = `${spec.id}-fill`;
    const lineId = `${spec.id}-line`;
    const filter = spec.timeFiltered ? yearFilter(this.year) : undefined;

    map.addLayer(
      {
        id: fillId,
        type: "fill",
        source: spec.id,
        ...(filter ? { filter } : {}),
        paint: {
          "fill-color": ["coalesce", ["get", "color"], spec.style.fill],
          "fill-opacity": spec.style.fillOpacity,
        },
      },
      before,
    );
    map.addLayer(
      {
        id: lineId,
        type: "line",
        source: spec.id,
        ...(filter ? { filter } : {}),
        paint: {
          "line-color": spec.style.line,
          "line-width": spec.style.lineWidth,
          "line-blur": spec.style.softenByConfidence
            ? ["match", ["get", "confidence"], "low", 4, "medium", 2, 0]
            : 0,
        },
      },
      before,
    );

    const drawn = [fillId, lineId];
    if (spec.style.highlightLine) {
      const highlightId = `${spec.id}${HIGHLIGHT_SUFFIX}`;
      map.addLayer(
        {
          id: highlightId,
          type: "line",
          source: spec.id,
          filter: this.highlightFilter(spec.id, spec.timeFiltered),
          paint: { "line-color": spec.style.highlightLine, "line-width": 2.5 },
        },
        before,
      );
      drawn.push(highlightId);
    }

    this.drawn.set(spec.id, drawn);
    if (spec.timeFiltered) this.timeFiltered.add(spec.id);
    if (spec.clickable) this.clickable.set(fillId, spec.id);
  }

  setLayerVisible(id: string, visible: boolean): void {
    const map = this.map;
    if (!map) return;
    for (const layerId of this.drawn.get(id) ?? []) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }

  removeLayer(id: string): void {
    const map = this.map;
    if (!map) return;
    for (const layerId of this.drawn.get(id) ?? []) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      this.clickable.delete(layerId);
    }
    if (map.getSource(id)) map.removeSource(id);
    this.drawn.delete(id);
    this.zOf.delete(id);
    this.timeFiltered.delete(id);
  }

  setYear(year: number): void {
    if (year === this.year) return;
    this.year = year;
    const map = this.map;
    if (!map) return;
    if (this.timeFiltered.size > 0) this.setBusy(true);
    const filter = yearFilter(year);
    for (const id of this.timeFiltered) {
      for (const layerId of this.drawn.get(id) ?? []) {
        map.setFilter(layerId, layerId.endsWith(HIGHLIGHT_SUFFIX) ? this.highlightFilter(id, true) : filter);
      }
    }
  }

  setHighlight(layerId: string, match: { property: string; value: string } | null): void {
    if (match) this.highlights.set(layerId, match);
    else this.highlights.delete(layerId);
    const highlightId = `${layerId}${HIGHLIGHT_SUFFIX}`;
    if (this.map?.getLayer(highlightId)) {
      this.map.setFilter(highlightId, this.highlightFilter(layerId, this.timeFiltered.has(layerId)));
    }
  }

  /** Matches the highlighted feature (in the current year, for time-filtered layers), or nothing. */
  private highlightFilter(specId: string, timeFiltered: boolean): FilterSpecification {
    const match = this.highlights.get(specId);
    if (!match) return ["==", ["literal", 1], 0];
    const isMatch: FilterSpecification = ["==", ["get", match.property], match.value];
    return timeFiltered
      ? ["all", ["<=", ["get", "start"], this.year], [">=", ["get", "end"], this.year], isMatch]
      : isMatch;
  }

  onClick(handler: (hit: ClickHit) => void): void {
    this.clickHandler = handler;
  }

  onBusyChange(handler: (busy: boolean) => void): void {
    this.busyHandler = handler;
    handler(this.busy);
  }

  private setBusy(busy: boolean): void {
    if (busy === this.busy) return;
    this.busy = busy;
    this.busyHandler?.(busy);
  }

  flyTo(location: [number, number]): void {
    this.map?.easeTo({ center: location, duration: 1200 });
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.clickHandler = null;
    this.busyHandler = null;
    this.drawn.clear();
    this.zOf.clear();
    this.timeFiltered.clear();
    this.clickable.clear();
    this.highlights.clear();
  }
}

function yearFilter(year: number): FilterSpecification {
  return ["all", ["<=", ["get", "start"], year], [">=", ["get", "end"], year]];
}
