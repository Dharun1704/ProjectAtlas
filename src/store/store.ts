import { create } from "zustand";
import type { Confidence, SourceRef } from "../data/types";
import { MAX_YEAR, MIN_YEAR, clampYear } from "../time/year";

export type LayerId = "borders";

/** The item shown in the inspect panel. */
export type Selection = {
  kind: "polity";
  polityId: string;
  name: string;
  wikidataId?: string;
  wikipedia?: string;
  /** First and last year the border dataset covers this polity, when known. */
  datasetRange?: { start: number; end: number };
  /** Validity range of the borders drawn for the current year; null when it has none this year. */
  shown: { start: number; end: number } | null;
  confidence: Confidence;
  sources: SourceRef[];
};

type AtlasState = {
  /** Current year, astronomical numbering. */
  year: number;
  /** Ends of the timeline. Narrower than the default range when the data stops earlier. */
  minYear: number;
  maxYear: number;
  activeLayers: Record<LayerId, boolean>;
  selection: Selection | null;
  setYear: (year: number) => void;
  /** Sets the timeline's ends, kept inside the default range. Moves the year if it falls outside. */
  setYearRange: (minYear: number, maxYear: number) => void;
  toggleLayer: (id: LayerId) => void;
  setSelection: (selection: Selection | null) => void;
};

export const useAtlasStore = create<AtlasState>((set) => ({
  year: 1,
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR,
  activeLayers: { borders: true },
  selection: null,
  setYear: (year) => set((s) => ({ year: clampYear(year, s.minYear, s.maxYear) })),
  setYearRange: (minYear, maxYear) =>
    set((s) => {
      const min = clampYear(minYear);
      const max = Math.max(min, clampYear(maxYear));
      return { minYear: min, maxYear: max, year: clampYear(s.year, min, max) };
    }),
  toggleLayer: (id) =>
    set((s) => ({ activeLayers: { ...s.activeLayers, [id]: !s.activeLayers[id] } })),
  setSelection: (selection) => set({ selection }),
}));
