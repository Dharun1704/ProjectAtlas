import { create } from "zustand";
import type { Confidence, SourceRef } from "../data/types";
import { MAX_YEAR, MIN_YEAR, clampYear } from "../time/year";

export type LayerId = "borders";
export type ThemeName = "light" | "dark";

/** The item shown in the inspect panel. */
export type Selection = {
  kind: "polity";
  polityId: string;
  name: string;
  wikidataId?: string;
  wikipedia?: string;
  /** Where the user clicked. The panel follows this spot when the polity stops being mapped. */
  location: [lon: number, lat: number];
  /** First and last year the border dataset covers this polity, when known. */
  datasetRange?: { start: number; end: number };
  /** Validity range of the borders drawn for the current year; null when it has none this year. */
  shown: { start: number; end: number } | null;
  /** Set when the panel switched to this polity because the previous one was no longer mapped. */
  switchedFrom?: { name: string; year: number };
  confidence: Confidence;
  sources: SourceRef[];
};

const THEME_KEY = "history-atlas-theme";

function savedTheme(): ThemeName {
  try {
    return globalThis.localStorage?.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light"; // storage blocked or unavailable
  }
}

type AtlasState = {
  /** Current year, astronomical numbering. */
  year: number;
  /** Ends of the timeline. Narrower than the default range when the data stops earlier. */
  minYear: number;
  maxYear: number;
  activeLayers: Record<LayerId, boolean>;
  selection: Selection | null;
  theme: ThemeName;
  meanwhileOpen: boolean;
  /** True while the globe has not finished drawing the borders for the current year. */
  globeBusy: boolean;
  /** Where the camera was last asked to go. A new object each time, so the same place can be asked for twice. */
  focus: { location: [lon: number, lat: number] } | null;
  setYear: (year: number) => void;
  /** Sets the timeline's ends, kept inside the default range. Moves the year if it falls outside. */
  setYearRange: (minYear: number, maxYear: number) => void;
  toggleLayer: (id: LayerId) => void;
  setSelection: (selection: Selection | null) => void;
  setTheme: (theme: ThemeName) => void;
  toggleMeanwhile: () => void;
  setGlobeBusy: (busy: boolean) => void;
  focusOn: (location: [lon: number, lat: number]) => void;
};

export const useAtlasStore = create<AtlasState>((set) => ({
  year: 1,
  minYear: MIN_YEAR,
  maxYear: MAX_YEAR,
  activeLayers: { borders: true },
  selection: null,
  theme: savedTheme(),
  meanwhileOpen: false,
  globeBusy: false,
  focus: null,
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
  setTheme: (theme) => {
    try {
      globalThis.localStorage?.setItem(THEME_KEY, theme);
    } catch {
      // The choice still applies for this visit.
    }
    set({ theme });
  },
  toggleMeanwhile: () => set((s) => ({ meanwhileOpen: !s.meanwhileOpen })),
  setGlobeBusy: (busy) => set((s) => (s.globeBusy === busy ? s : { globeBusy: busy })),
  focusOn: (location) => set({ focus: { location } }),
}));
