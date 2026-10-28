"use client";

import { useRef, useState } from "react";
import type { Series } from "@/lib/detail";
import { shortDate } from "@/lib/model";
import type { Scan } from "@/lib/types";

// The one trend chart used everywhere (report hero, area, metric, product), so
// the same data always draws the same line at the same size. That is what lets
// the hero chart carry over to the area page without jumping or reshaping.
// It scales with its box (no measuring), so it never redraws after first paint.
// Drag (or hover) across it to read the exact score on any scan day.
const H = 64;

// Score bands, the same ones the score explainer uses (0–40 / 40–70 / 70–100).
// Every score is "higher is healthier", so a dashed line marks where a band starts.
const BANDS = [
  { from: 70, name: "Good" },
  { from: 40, name: "Okay" },
  { from: 0, name: "Needs care" },
];

export function LineChart({
  data,
  markers = [],
  onPick,
  label,
  name,
}: {
  data: Series;
  /** Thin vertical lines, e.g. the day a product started. Timestamps. */
  markers?: number[];
  onPick?: (scan: Scan) => void;
  label: string;
  /** view-transition-name, for charts that morph between screens. */
  name?: string;
}) {
  const vals = data.points.map((p) => p.value);
  let lo = Math.min(...vals) - 3, hi = Math.max(...vals) + 3;
  // If no band edge falls inside, stretch to the nearest one (when it's close) so
  // the chart always shows where "good" starts relative to the line.
  if (!BANDS.some((b) => b.from > lo && b.from < hi)) {
    const near = BANDS.map((b) => b.from).filter((f) => f > 0).sort((x, y) => Math.min(Math.abs(x - lo), Math.abs(x - hi)) - Math.min(Math.abs(y - lo), Math.abs(y - hi)))[0];
    if (near > hi && near - hi <= 12) hi = near + 4;
    else if (near < lo && lo - near <= 12) lo = near - 4;
  }
  const span = data.end - data.start || 1;
  const fx = (at: number) => ((at - data.start) / span) * 100; // percent
  const fy = (v: number) => (1 - (v - lo) / (hi - lo)) * H;
  const d = data.points.map((p, i) => `${i ? "L" : "M"}${fx(p.at).toFixed(2)} ${fy(p.value).toFixed(2)}`).join(" ");
  const last = data.points[data.points.length - 1];
  // Band edges inside the visible range get a faint dashed line.
  const edges = BANDS.filter((b) => b.from > lo && b.from < hi);

  // Scrubbing: the nearest scan to the pointer gets a guide line, a dot and its score.
  const [at, setAt] = useState<number | null>(null);
  const dragged = useRef(false);
  const start = useRef<number | null>(null);
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    let best = 0;
    data.points.forEach((p, i) => {
      if (Math.abs(fx(p.at) - x) < Math.abs(fx(data.points[best].at) - x)) best = i;
    });
    setAt(best);
  };
  const cur = at != null ? data.points[at] : null;

  return (
    <figure
      className={`lchart ${cur ? "scrubbing" : ""}`}
      style={name ? { viewTransitionName: name } : undefined}
      // A drag reads values; only a plain tap goes through to whatever wraps the chart.
      onClickCapture={(e) => {
        if (dragged.current) {
          e.preventDefault();
          e.stopPropagation();
          dragged.current = false;
        }
      }}
    >
      <div
        className="plot"
        onPointerDown={(e) => {
          start.current = e.clientX;
          dragged.current = false;
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" || start.current != null) {
            if (start.current != null && Math.abs(e.clientX - start.current) > 6) dragged.current = true;
            if (e.pointerType === "mouse" || dragged.current) pick(e);
          }
        }}
        onPointerUp={(e) => {
          start.current = null;
          if (e.pointerType !== "mouse") setAt(null);
        }}
        onPointerCancel={() => {
          start.current = null;
          setAt(null);
        }}
        onPointerLeave={() => {
          start.current = null;
          setAt(null);
        }}
      >
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
          {edges.map((b) => (
            <line key={b.from} x1={0} x2={100} y1={fy(b.from)} y2={fy(b.from)} className="edge" />
          ))}
          {markers
            .filter((m) => m > data.start && m < data.end)
            .map((m) => (
              <line key={m} x1={fx(m)} x2={fx(m)} y1={0} y2={H} className="marker" />
            ))}
          <path d={d} className="line" />
          {onPick &&
            data.points.map((p, i) => {
              const prev = data.points[i - 1], next = data.points[i + 1];
              const x0 = prev ? (fx(prev.at) + fx(p.at)) / 2 : 0;
              const x1 = next ? (fx(p.at) + fx(next.at)) / 2 : 100;
              return <rect key={p.scan.id} x={x0} y={0} width={x1 - x0} height={H} className="hit" onClick={() => onPick(p.scan)} aria-label={`${shortDate(p.scan)}: ${p.value}`} />;
            })}
        </svg>
        <span className="end" style={{ left: `${fx(last.at)}%`, top: `${(fy(last.value) / H) * 100}%` }} />
        {cur && (
          <>
            <span className="scrub-line" style={{ left: `${fx(cur.at)}%` }} />
            <span className="end scrub-dot" style={{ left: `${fx(cur.at)}%`, top: `${(fy(cur.value) / H) * 100}%` }} />
          </>
        )}
      </div>
      {/* Outside .plot so the plot's reveal clip never hides it. */}
      {cur && (
        <span className="scrub-read" style={{ left: `clamp(0px, calc(${fx(cur.at)}% - 40px), calc(100% - 80px))` }}>
          <b>{cur.value}</b> {shortDate(cur.scan)}
        </span>
      )}
      <figcaption>
        <span>{shortDate(data.points[0].scan)}</span>
        <span>{shortDate(last.scan)}</span>
      </figcaption>
    </figure>
  );
}
