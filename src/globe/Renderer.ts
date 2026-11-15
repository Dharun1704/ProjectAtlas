import type { FeatureCollection, LineString, MultiLineString, MultiPolygon, Polygon } from "geojson";
import type { Confidence } from "../data/types";

/**
 * The only way the app talks to the globe. Features and layers build
 * renderer-agnostic LayerSpecs; an implementation (MapLibre today, possibly a
 * custom WebGPU renderer later) turns them into pixels.
 */

/** Properties a polygon feature may carry. Time-filtered layers need start and end. */
export type PolygonProps = {
  start?: number;
  end?: number;
  confidence?: Confidence;
  color?: string;
  [key: string]: unknown;
};

type LayerBase = {
  id: string;
  /** Stacking order: higher draws on top. */
  z: number;
};

export type PolygonLayerSpec = LayerBase & {
  kind: "polygons";
  data: FeatureCollection<Polygon | MultiPolygon, PolygonProps>;
  /** When true, only features with start <= year <= end are drawn. */
  timeFiltered: boolean;
  /** When true, clicks on this layer's features are reported to onClick. */
  clickable: boolean;
  style: {
    fill: string;
    fillOpacity: number;
    line: string;
    lineWidth: number;
    /** Blur the outline of medium/low confidence features. */
    softenByConfidence: boolean;
    /** Outline colour for the highlighted feature. Needed only if setHighlight is used on this layer. */
    highlightLine?: string;
  };
};

export type LineLayerSpec = LayerBase & {
  kind: "lines";
  data: FeatureCollection<LineString | MultiLineString>;
  style: { color: string; width: number; opacity: number };
};

export type LayerSpec = PolygonLayerSpec | LineLayerSpec;

/** A click on the globe: where it landed, and the topmost clickable feature there, if any. */
export type ClickHit = {
  location: [lon: number, lat: number];
  feature: { layerId: string; properties: Record<string, unknown> } | null;
};

export interface Renderer {
  /** Creates the globe inside `container`. Resolves when it is ready for layers. */
  mount(container: HTMLElement): Promise<void>;
  /** Colour of the bare globe (the sea), under every layer. */
  setBaseColor(color: string): void;
  /**
   * Adds a layer. If a layer with this id already exists, only its data is
   * replaced; to change its style, removeLayer first.
   */
  setLayer(spec: LayerSpec): void;
  setLayerVisible(id: string, visible: boolean): void;
  removeLayer(id: string): void;
  /** Updates time-filtered layers. Must be cheap: called on every slider move. */
  setYear(year: number): void;
  /** Registers the single click handler. */
  onClick(handler: (hit: ClickHit) => void): void;
  /**
   * Outlines the features of a polygon layer whose `property` equals `value`.
   * Pass null to clear. Survives data and style changes to the layer.
   */
  setHighlight(layerId: string, match: { property: string; value: string } | null): void;
  /**
   * Registers the single busy handler. The globe is busy from the moment its
   * data or year changes until it has finished drawing the result.
   */
  onBusyChange(handler: (busy: boolean) => void): void;
  /** Turns the globe, calmly, so `location` is at the centre of the view. */
  flyTo(location: [lon: number, lat: number]): void;
  destroy(): void;
}
