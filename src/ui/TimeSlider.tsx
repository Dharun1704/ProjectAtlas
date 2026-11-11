import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useAtlasStore } from "../store/store";
import { labelledTickYears, minorTickStep, pickTickStep, yearsAtMultiples } from "../time/ticks";
import { formatYear } from "../time/year";

const MIN_PX_PER_YEAR = 0.12;
const MAX_PX_PER_YEAR = 40;
const DEFAULT_PX_PER_YEAR = 1;
const RULER_HEIGHT = 46;
/** A press that moves less than this is a click (jump to that year), not a drag. */
const CLICK_SLOP_PX = 4;
/** Labels closer than this to the needle are hidden so it does not cut through them. */
const LABEL_CLEARANCE_PX = 30;

function clampZoom(pxPerYear: number): number {
  return Math.min(MAX_PX_PER_YEAR, Math.max(MIN_PX_PER_YEAR, pxPerYear));
}

/**
 * The timeline: a ruler of years that slides under a fixed needle.
 * Drag to move through time, scroll (or use the buttons) to zoom the scale
 * from millennia down to single years, click a spot to jump there.
 */
export function TimeSlider() {
  const year = useAtlasStore((s) => s.year);
  const minYear = useAtlasStore((s) => s.minYear);
  const maxYear = useAtlasStore((s) => s.maxYear);
  const setYear = useAtlasStore((s) => s.setYear);

  const [pxPerYear, setPxPerYear] = useState(DEFAULT_PX_PER_YEAR);
  const [width, setWidth] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startYear: number; moved: boolean } | null>(null);
  const pxPerYearRef = useRef(pxPerYear);
  pxPerYearRef.current = pxPerYear;

  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wheel needs a non-passive listener so the page does not scroll or zoom.
  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    let leftover = 0; // fractional years carried between small sideways scrolls
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        leftover += e.deltaX / pxPerYearRef.current;
        const whole = Math.trunc(leftover);
        if (whole !== 0) {
          leftover -= whole;
          const store = useAtlasStore.getState();
          store.setYear(store.year + whole);
        }
      } else {
        setPxPerYear((p) => clampZoom(p * Math.exp(-e.deltaY * 0.0015)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startYear: year, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) >= CLICK_SLOP_PX) d.moved = true;
    if (d.moved) setYear(d.startYear - dx / pxPerYear);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      const rect = e.currentTarget.getBoundingClientRect();
      setYear(d.startYear + (e.clientX - rect.left - rect.width / 2) / pxPerYear);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 10 : 1;
    const moves: Record<string, number> = {
      ArrowLeft: year - big,
      ArrowDown: year - big,
      ArrowRight: year + big,
      ArrowUp: year + big,
      PageDown: year - 100,
      PageUp: year + 100,
      Home: minYear,
      End: maxYear,
    };
    const target = moves[e.key];
    if (target === undefined) return;
    e.preventDefault();
    setYear(target);
  };

  const half = width / 2;
  const x = (y: number) => half + (y - year) * pxPerYear;
  const from = Math.max(minYear, year - half / pxPerYear);
  const to = Math.min(maxYear, year + half / pxPerYear);
  const step = pickTickStep(pxPerYear);
  const labelled = width > 0 ? labelledTickYears(from, to, step) : [];
  const labelledSet = new Set(labelled);
  const minorStep = minorTickStep(step);
  const minor =
    width > 0 && minorStep > 0 ? yearsAtMultiples(from, to, minorStep).filter((y) => !labelledSet.has(y)) : [];
  const startX = x(minYear);
  const endX = x(maxYear);

  return (
    <div className="time-slider">
      <div className="time-slider__head">
        <div className="time-slider__now">
          <button type="button" aria-label="One year earlier" onClick={() => setYear(year - 1)} disabled={year <= minYear}>
            ‹
          </button>
          <output className="time-slider__year">{formatYear(year)}</output>
          <button type="button" aria-label="One year later" onClick={() => setYear(year + 1)} disabled={year >= maxYear}>
            ›
          </button>
        </div>
        <div className="time-slider__zoom">
          <button
            type="button"
            aria-label="Zoom timeline out"
            onClick={() => setPxPerYear((p) => clampZoom(p / 1.6))}
            disabled={pxPerYear <= MIN_PX_PER_YEAR}
          >
            −
          </button>
          <button
            type="button"
            aria-label="Zoom timeline in"
            onClick={() => setPxPerYear((p) => clampZoom(p * 1.6))}
            disabled={pxPerYear >= MAX_PX_PER_YEAR}
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={rulerRef}
        className="time-slider__ruler"
        role="slider"
        tabIndex={0}
        aria-label="Year"
        aria-valuemin={minYear}
        aria-valuemax={maxYear}
        aria-valuenow={year}
        aria-valuetext={formatYear(year)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
      >
        {width > 0 && (
          <svg width={width} height={RULER_HEIGHT} aria-hidden="true">
            {startX > 0 && <rect className="time-slider__beyond" x={0} y={0} width={startX} height={RULER_HEIGHT} />}
            {endX < width && (
              <rect className="time-slider__beyond" x={endX} y={0} width={width - endX} height={RULER_HEIGHT} />
            )}
            {minor.map((y) => (
              <line key={`m${y}`} className="time-slider__tick time-slider__tick--minor" x1={x(y)} x2={x(y)} y1={0} y2={6} />
            ))}
            {endX < width - 110 && (
              <text className="time-slider__beyond-label" x={endX + 10} y={30}>
                no data after {formatYear(maxYear)}
              </text>
            )}
            {labelled.map((y) => (
              <g key={`l${y}`}>
                <line className="time-slider__tick" x1={x(y)} x2={x(y)} y1={0} y2={13} />
                {/* The needle would cover a label right under it; the big readout shows that year. */}
                {Math.abs(x(y) - half) > LABEL_CLEARANCE_PX && (
                  <text className="time-slider__label" x={x(y)} y={30} textAnchor="middle">
                    {formatYear(y)}
                  </text>
                )}
              </g>
            ))}
            <line className="time-slider__needle" x1={half} x2={half} y1={0} y2={RULER_HEIGHT} />
            <path className="time-slider__needle-head" d={`M ${half - 6} 0 L ${half + 6} 0 L ${half} 8 Z`} />
          </svg>
        )}
      </div>
    </div>
  );
}
