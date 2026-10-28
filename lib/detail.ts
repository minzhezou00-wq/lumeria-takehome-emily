// What the second-level screens need: one area, one scan, one metric, and
// Lumi's answers. Everything is read from the report; nothing is invented.

import type { MetricKey, Product, Scan, SkinReport } from "./types";
import { METRICS, changeFor, metricLabel, shortDate, type ReportView, type TimelineEvent } from "./model";

const DAY = 86_400_000;
const t = (s: Scan) => Date.parse(s.takenAt);

export const areaScans = (v: ReportView, area: string) => v.scans.filter((s) => s.area === area);

/** Everything the report's top block shows for one area. Areas aren't comparable, so each stands alone. */
export function areaOverview(v: ReportView, area: string) {
  const list = areaScans(v, area);
  const first = list[0], latest = list[list.length - 1];
  // A change only counts when the area was scanned over at least a week.
  const span = t(latest) - t(first);
  const change = (key: MetricKey | "overall") => {
    const a = first.scores[key], b = latest.scores[key];
    return list.length < 2 || span < 7 * DAY || a == null || b == null ? null : b - a;
  };
  const days = span / DAY;
  return {
    list,
    latest,
    score: latest.scores.overall,
    delta: change("overall"),
    deltaLabel: days >= 25 && days <= 35 ? "vs a month ago" : `since ${shortDate(first)}`,
    trend: list.length >= 3 ? series(list, "overall") : null,
    metrics: METRICS.map((m) => ({ ...m, value: latest.scores[m.key] ?? null, delta: change(m.key) })),
  };
}

/** An event's score change measured on a given area's scans. */
export const eventChange = (v: ReportView, e: TimelineEvent, area: string) =>
  area === v.primaryArea ? e.change : e.window && changeFor(areaScans(v, area), e.window);

/** Newest real photo of an area, else its newest photo of any kind. */
export function areaPhoto(v: ReportView, area: string) {
  const list = areaScans(v, area).reverse();
  return (list.find((s) => s.photoUrl?.endsWith(".jpg")) ?? list.find((s) => s.photoUrl))?.photoUrl ?? undefined;
}

/** The scan before this one on the same area, for "vs last time" changes. */
export function previousScan(v: ReportView, scan: Scan) {
  const list = areaScans(v, scan.area);
  return list[list.indexOf(scan) - 1];
}

/** First and latest scans to compare, preferring ones with real three-light photos. */
export function comparePair(list: Scan[]): [Scan, Scan] | null {
  if (list.length < 2) return null;
  const real = list.filter((s) => s.photos);
  return real.length >= 2 ? [real[0], real[real.length - 1]] : [list[0], list[list.length - 1]];
}

export interface Series {
  points: { at: number; value: number; scan: Scan }[];
  start: number;
  end: number;
}

export function series(list: Scan[], key: MetricKey | "overall"): Series | null {
  const points = list
    .map((s) => ({ at: t(s), value: s.scores[key], scan: s }))
    .filter((p): p is { at: number; value: number; scan: Scan } => p.value != null);
  if (points.length < 2) return null;
  return { points, start: points[0].at, end: points[points.length - 1].at };
}

/** Days a product still in use was started inside the report: drawn on trend charts. */
export function productMarkers(report: SkinReport) {
  const first = report.period?.start;
  return (report.products ?? []).filter((p) => !p.endDate && first && p.startDate > first).map((p) => Date.parse(p.startDate + "T12:00:00Z"));
}

export function productSpan(p: Product) {
  return {
    start: Date.parse(p.startDate + "T00:00:00Z"),
    end: p.endDate ? Date.parse(p.endDate + "T23:59:59Z") : Infinity,
  };
}

// ---------- Lumi ----------
// A prototype stand-in for the Claude API: each answer is assembled from the
// person's own data, and anything medical is sent to a professional.
export function lumiAnswer(report: SkinReport, v: ReportView, question: string): string {
  const q = question.toLowerCase();
  const cheek = areaScans(v, v.primaryArea);

  const trip = v.events.find((e) => e.key === "trip");
  if (trip && /redder|red|trip|phoenix|travel/.test(q)) {
    const city = trip.date.split("· ")[1].replace(" trip", "");
    const away = v.scans.filter((s) => s.location?.city === city);
    const uv = Math.max(...away.map((s) => s.location!.environment.uvIndexMax));
    const hum = Math.min(...away.map((s) => s.location!.environment.humidityPct));
    const before = cheek.filter((s) => t(s) < t(away[0])).pop();
    const low = cheek.filter((s) => t(s) <= t(away[away.length - 1]) + DAY).reduce((m, s) => (s.scores.redness < m.scores.redness ? s : m));
    const sun = away.find((s) => /sunscreen/i.test(s.annotation?.note ?? ""));
    return [
      `In ${city} the UV index reached ${uv} and the air was as dry as ${hum}% humidity.`,
      before ? `Your calmness score went from ${before.scores.redness} to ${low.scores.redness} by ${shortDate(low)}.` : "",
      sun ? `On ${shortDate(sun)} you noted: "${sun.annotation!.note}"` : "",
      "Strong sun and dry air often leave skin redder for a few days. Yours settled after you got home.",
    ].filter(Boolean).join(" ");
  }

  const started = (report.products ?? []).filter((p) => !p.endDate && p.startDate > (report.period?.start ?? ""));
  const product = started.find((p) => q.includes(p.name.toLowerCase().split(" ")[0])) ?? (/how long|keep using/.test(q) ? started[0] : undefined);
  if (product) {
    const { start } = productSpan(product);
    const during = cheek.filter((s) => t(s) >= start);
    const days = Math.round((t(v.latest) - start) / DAY);
    const first = during[0], last = during[during.length - 1];
    return [
      `You started ${product.name} ${days} days ago.`,
      first && last && first !== last ? `Since then your calmness went from ${first.scores.redness} to ${last.scores.redness}.` : "",
      "Give a new product about a month before you judge it, and keep scanning the same spot so the change is clear.",
      "For how long to use it, follow the label or ask a dermatologist.",
    ].filter(Boolean).join(" ");
  }

  if (/next|when|scan/.test(q)) return `Your next scan is ${v.nextScan.date}, in the morning, on your ${v.primaryArea.toLowerCase()}. Scanning the same spot at the same time of day keeps your scores comparable.`;

  if (/focus|improve|should|work on/.test(q)) {
    const worst = [...v.metrics].filter((m) => m.value != null).sort((a, b) => a.value! - b.value!)[0];
    return `${worst.label} is your lowest score at ${worst.value}. ${METRICS.find((m) => m.key === worst.key)!.means.replace("How", "It shows how")} A short note after each scan will help us see what moves it.`;
  }

  if (/score|mean|number/.test(q))
    return `Each area you scan gets its own score out of 100, from its latest scan. Higher is healthier. Your ${v.primaryArea.toLowerCase()} is at ${v.areas.find((x) => x.name === v.primaryArea)!.latest.scores.overall}. Areas aren't averaged together, because skin differs from spot to spot.`;

  return `I can only answer from your own scans and notes. Try asking about your ${metricLabel("redness").toLowerCase()}, your products, or when to scan next.`;
}
