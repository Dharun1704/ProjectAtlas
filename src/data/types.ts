import type { MultiPolygon } from "geojson";

/**
 * Data model from CLAUDE.md §5.
 * Optional fields are filled only when the source provides the value.
 */

export type Confidence = "high" | "medium" | "low";

export type SourceRef = { title: string; url?: string; dataset?: string; license?: string };

export type Polity = {
  /** "<dataset>:<name>", e.g. "cliopatria:Roman Empire". */
  id: string;
  /** Link given by the dataset. Not unique per polity. */
  wikidataId?: string;
  name: string;
  altNames?: string[];
  start: number;
  end: number;
  /** Wikidata sitelink count. */
  importance?: number;
  /** Modern region holding most of the polity at its largest extent. */
  region?: string;
  color?: string;
  sources: SourceRef[];
  confidence: Confidence;
};

export type BorderSnapshot = {
  polityId: string;
  /** Validity range from the dataset. A point-in-time snapshot has start === end. */
  start: number;
  end: number;
  geometry: MultiPolygon;
  sources: SourceRef[];
  confidence: Confidence;
};

export type HistEvent = {
  id: string;
  title: string;
  kind: "battle" | "founding" | "treaty" | "disaster" | "other";
  year: number;
  endYear?: number;
  circa?: boolean;
  earliest?: number;
  latest?: number;
  location?: [lon: number, lat: number];
  causes?: string[];
  effects?: string[];
  /** Shortened Wikipedia lead extract, shown with attribution. */
  summary: string;
  importance?: number;
  sources: SourceRef[];
  confidence: Confidence;
};

export type Journey = {
  id: string;
  person: string;
  /** Array order is the travel sequence. */
  stops: {
    year: number;
    month?: number;
    circa?: boolean;
    location: [lon: number, lat: number];
    note?: string;
  }[];
  sources: SourceRef[];
  confidence: Confidence;
};
