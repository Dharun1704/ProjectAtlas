import type { Feature, FeatureCollection, LineString } from "geojson";
import type { LineLayerSpec } from "./Renderer";

export const GRATICULE_LAYER_ID = "graticule";

/** Latitude/longitude grid lines. Pure geometry, not historical data. */
export function graticule(stepDegrees = 30, pointSpacing = 5): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];

  for (let lon = -180; lon < 180; lon += stepDegrees) {
    const coords: [number, number][] = [];
    for (let lat = -85; lat <= 85; lat += pointSpacing) coords.push([lon, lat]);
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }

  for (let lat = -90 + stepDegrees; lat < 90; lat += stepDegrees) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += pointSpacing) coords.push([lon, lat]);
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }

  return { type: "FeatureCollection", features };
}

export function graticuleLayer(color: string, opacity: number): LineLayerSpec {
  return {
    id: GRATICULE_LAYER_ID,
    kind: "lines",
    z: 30,
    data: graticule(),
    style: { color, width: 0.8, opacity },
  };
}
