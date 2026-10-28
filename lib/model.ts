// Turns a raw SkinReport from the API into what the report screen shows.
// Every rule here is a design decision; the reasons are in SUBMISSION.md.

import extras from "@/data/mock/extras.json";
import type { MetricKey, Product, Scan, SkinReport } from "./types";

const DAY = 86_400_000;

// Metric names match the API. Every score is "higher is healthier" (a redness
// score of 84 means calm skin); the score explainer says so.
export const METRICS: { key: MetricKey; label: string; icon: "drop" | "circle-half" | "fire" | "sun" | "sparkle"; means: string }[] = [
  { key: "hydration", label: "Hydration", icon: "drop", means: "How much water your skin holds." },
  { key: "evenness", label: "Evenness", icon: "circle-half", means: "How smooth and even your skin looks." },
  { key: "redness", label: "Redness", icon: "fire", means: "How little redness we see." },
  { key: "pigmentation", label: "Pigmentation", icon: "sun", means: "How few dark spots we see." },
  { key: "oiliness", label: "Oiliness", icon: "sparkle", means: "How little extra shine we see." },
];

export const metricLabel = (k: MetricKey) => METRICS.find((m) => m.key === k)!.label;

// ---------- dates ----------
// takenAt is UTC. Show it in the time zone where the scan was taken; scans
// without a location fall back to the viewer's own time zone.
const tzOf = (s: Scan) => s.location?.tz;
const fmt = (s: Scan, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tzOf(s), ...opts }).format(new Date(s.takenAt));
export const shortDate = (s: Scan) => fmt(s, { month: "short", day: "numeric" });
export const weekdayDate = (s: Scan) => fmt(s, { weekday: "long", month: "short", day: "numeric" });
export const timeOfDay = (s: Scan) => fmt(s, { hour: "numeric", minute: "2-digit" }).toLowerCase();
export const dayKey = (s: Scan) => fmt(s, { year: "numeric", month: "2-digit", day: "2-digit" });
const isoToShort = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
const t = (s: Scan) => Date.parse(s.takenAt);

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round = Math.round;

// ---------- view model ----------
export interface AreaSummary {
  name: string;
  count: number;
  first: Scan;
  latest: Scan;
  /** null when the area has too few scans, or too short a span, to show a change */
  delta: number | null;
}

export interface TimelineEvent {
  key: string;
  date: string;
  title: string;
  source: string;
  icon: "cloud-sun" | "heart" | "flask" | "note-pencil";
  highlight?: boolean;
  /** The scan this event points at, opened on tap. */
  scanId?: string;
  /** Which score moved around this event, on the main area, and by how much. */
  change?: { label: string; from: number; to: number };
  /** How to measure that move, so it can be redone for any area (see changeFor). */
  window?: EventWindow;
}

/** worst: lowest `key` inside the span vs the scan before it. after: the scan
 *  before vs the first one within two days. use: first vs last scan while a
 *  product was in use. span: scan before vs last scan in the span. */
export type EventWindow =
  | { kind: "worst"; from: number; to: number; key: MetricKey }
  | { kind: "after"; at: number }
  | { kind: "use"; from: number; to: number }
  | { kind: "span"; from: number; to: number; key: MetricKey };

export interface ProductRow {
  id: string;
  name: string;
  image?: string;
  since: string;
  status: "In use" | "Stopped";
  effect: { text: string; tone: "better" | "worse" | "neutral"; key?: MetricKey };
  ingredients: Ingredient[];
}

export interface PlanStep {
  title: string;
  /** When we'd remind her, e.g. "Every night · 9 PM". */
  when: string;
}

/** A recommended product (assumed data, extras.json). The first one is the best match. */
/** One line of "For your skin": what is in a product and whether it suits her. */
export interface Ingredient {
  name: string;
  ok: boolean;
  why: string;
}

export interface Suggestion {
  brand: string;
  name: string;
  price: number;
  image: string;
  url: string;
  ingredients: Ingredient[];
  research?: { label: string; url: string };
}

export interface ReportView {
  firstName: string;
  scans: Scan[];
  latest: Scan;
  deltaLabel: string;
  metrics: ((typeof METRICS)[number] & { value: number | null; delta: number | null })[];
  /** The most-scanned area this week; charts use it because areas aren't comparable. */
  primaryArea: string;
  areas: AreaSummary[];
  events: TimelineEvent[];
  noteCount: number;
  products: ProductRow[] | null;
  recommendation: { forMetric: string; why: string; items: Suggestion[] } | null;
  preferences: string[];
  /** date: "Oct 24" */
  nextScan: { date: string };
  plan: PlanStep[];
  askChips: string[];
}

function groupAreas(scans: Scan[]) {
  const map = new Map<string, Scan[]>();
  for (const s of scans) map.set(s.area, [...(map.get(s.area) ?? []), s]);
  return map;
}

// A change is only shown when one area has been scanned over at least a week.
function areaDelta(list: Scan[], key: MetricKey | "overall" = "overall"): number | null {
  if (list.length < 2) return null;
  const first = list[0], last = list[list.length - 1];
  if (t(last) - t(first) < 7 * DAY) return null;
  const a = first.scores[key], b = last.scores[key];
  return a == null || b == null ? null : b - a;
}

export function buildView(report: SkinReport): ReportView {
  const scans = [...report.scans].sort((a, b) => t(a) - t(b));
  const latest = scans[scans.length - 1];
  const byArea = groupAreas(scans);

  // Areas scanned in the 7 days up to the latest scan.
  const thisWeek = [...byArea.entries()].filter(([, l]) => t(latest) - t(l[l.length - 1]) <= 7 * DAY);

  const spanDays = (t(latest) - t(scans[0])) / DAY;
  const deltaLabel = spanDays >= 25 && spanDays <= 35 ? "vs a month ago" : `since ${shortDate(scans[0])}`;

  // The main area: most-scanned among this week's. The report opens on it.
  const primary = [...thisWeek].sort((a, b) => b[1].length - a[1].length)[0];
  const series = primary[1];

  const metrics = METRICS.map((m) => {
    const vals = thisWeek.map(([, l]) => l[l.length - 1].scores[m.key]).filter((v): v is number => v != null);
    const ds = thisWeek.map(([, l]) => areaDelta(l, m.key)).filter((d): d is number => d != null);
    return { ...m, value: vals.length ? round(avg(vals)) : null, delta: ds.length ? round(avg(ds)) : null };
  });

  const areas: AreaSummary[] = [...byArea.entries()]
    .map(([name, l]) => ({
      name,
      count: l.length,
      first: l[0],
      latest: l[l.length - 1],
      delta: areaDelta(l),
    }))
    .sort((a, b) => b.count - a.count);

  const products = report.products ? productRows(report.products, series, report.period?.start) : null;
  const events = timeline(report, scans, series);
  const noteCount = scans.filter((s) => s.annotation?.note).length;

  const rec = (extras.recommendations as Record<string, ReportView["recommendation"]>)[report.id] ?? null;
  const preferences = (extras.preferences as Record<string, string[]>)[report.id] ?? [];

  const next = new Date(t(latest) + 2 * DAY);
  const nextLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tzOf(latest) }).format(next);

  return {
    firstName: report.person.firstName,
    scans,
    latest,
    deltaLabel,
    metrics,
    primaryArea: primary[0],
    areas,
    events,
    noteCount,
    products,
    recommendation: rec,
    preferences,
    nextScan: { date: nextLabel },
    plan: planSteps(events, products, scans, primary[0], nextLabel),
    askChips: askChips(events),
  };
}

// ---------- products ----------
// The metric that moved most while a product was in use, on the main area only:
// first scan in use against the last. Shared by the product list and the timeline.
function productMove(p: Product, series: Scan[]) {
  const w = useWindow(p) as { from: number; to: number };
  return moveIn(series.filter((s) => t(s) >= w.from && t(s) <= w.to));
}

function moveIn(during: Scan[]) {
  if (during.length < 2) return null;
  let best: { key: MetricKey; from: number; to: number } | null = null;
  for (const m of METRICS) {
    const a = during[0].scores[m.key], b = during[during.length - 1].scores[m.key];
    if (a == null || b == null) continue;
    if (!best || Math.abs(b - a) > Math.abs(best.to - best.from)) best = { key: m.key, from: a, to: b };
  }
  return best && best.to !== best.from ? best : null;
}

function productRows(products: Product[], series: Scan[], periodStart?: string): ProductRow[] {
  const meta = extras.products as Record<string, { shortName: string; image?: string; ingredients?: Ingredient[] }>;
  const rows: ProductRow[] = products.map((p): ProductRow => {
    const stopped = p.endDate != null;
    let effect: ProductRow["effect"] = { text: "Used all month", tone: "neutral" };
    const best = periodStart && p.startDate <= periodStart && !stopped ? null : productMove(p, series);
    if (best) {
      const d = best.to - best.from;
      effect = { text: `${metricLabel(best.key)} ${d > 0 ? "+" : "−"}${Math.abs(d)}`, tone: d > 0 ? "better" : "worse", key: best.key };
    }
    const reason = p.stoppedReason ? ` · ${p.stoppedReason.split(" ")[0].toLowerCase() === "stinging" ? "stung" : "stopped"}` : "";
    return {
      id: p.id,
      name: meta[p.id]?.shortName ?? p.name,
      image: meta[p.id]?.image,
      since: stopped ? `Stopped ${isoToShort(p.endDate!)}${reason}` : `Since ${isoToShort(p.startDate)}`,
      status: stopped ? "Stopped" : "In use",
      effect,
      ingredients: meta[p.id]?.ingredients ?? [],
    };
  });
  // In use first (newest first), then stopped.
  return rows.sort((a, b) => (a.status === b.status ? (a.since < b.since ? 1 : -1) : a.status === "In use" ? -1 : 1));
}

// ---------- what changed ----------
function timeline(report: SkinReport, scans: Scan[], series: Scan[]): TimelineEvent[] {
  const out: (TimelineEvent & { at: number })[] = [];
  const meta = extras.products as Record<string, { verb?: string; image?: string }>;

  // Trips: scans away from the most common city.
  const cities = scans.map((s) => s.location?.city).filter(Boolean) as string[];
  if (cities.length) {
    const home = mode(cities);
    const away = scans.filter((s) => s.location && s.location.city !== home);
    if (away.length) {
      const city = away[0].location!.city;
      const before = series.filter((s) => t(s) < t(away[0])).pop();
      const inTrip = series.filter((s) => t(s) >= t(away[0]) - DAY && t(s) <= t(away[away.length - 1]) + DAY);
      const worst = inTrip.reduce((m, s) => (s.scores.redness < m.scores.redness ? s : m), inTrip[0] ?? away[0]);
      const dropped = before && worst && before.scores.redness - worst.scores.redness >= 10;
      out.push({
        key: "trip",
        at: t(away[0]),
        date: `${shortDate(away[0])} – ${shortDate(away[away.length - 1]).split(" ")[1]} · ${city} trip`,
        title: dropped ? "Skin got redder" : `Trip to ${city}`,
        source: "Local weather",
        icon: "cloud-sun",
        scanId: worst?.id,
        window: { kind: "worst", from: t(away[0]), to: t(away[away.length - 1]) + DAY, key: "redness" },
      });
    }
  }

  // Period start from Apple Health.
  const period = scans.find((s) => s.health?.cycleDay === 1);
  if (period)
    out.push({ key: "period", at: t(period), date: shortDate(period), title: "Period started", source: "Apple Health · Cycle", icon: "heart", scanId: period.id, window: { kind: "after", at: t(period) } });

  // Products started or stopped inside the report.
  const start = scans[0] ? t(scans[0]) : 0;
  for (const p of report.products ?? []) {
    const verb = meta[p.id]?.verb ?? p.name.toLowerCase();
    if (p.endDate) {
      const at = Date.parse(p.endDate + "T12:00:00Z");
      out.push({ key: p.id + "-stop", at, date: isoToShort(p.endDate), title: `Stopped ${verb}`, source: `Your note · ${isoToShort(p.endDate)}`, icon: "flask", scanId: scanNear(scans, at)?.id, window: useWindow(p) });
    }
    const at = Date.parse(p.startDate + "T12:00:00Z");
    if (at > start + DAY && !p.endDate) {
      out.push({ key: p.id + "-start", at, date: isoToShort(p.startDate), title: `Started ${verb}`, source: "Your routine", icon: "flask", highlight: true, scanId: scanNear(scans, at)?.id, window: useWindow(p) });
    }
  }

  // Short sleep from Apple Health, or a rough patch from manual check-ins.
  const tired = scans.filter((s) => (s.health?.sleepHours ?? s.checkin?.sleepHours ?? 9) < 6);
  const run = longestRun(tired, scans);
  if (run.length >= 2) {
    const a = run[0], b = run[run.length - 1];
    const oilA = series.filter((s) => t(s) < t(a)).pop()?.scores.oiliness;
    const oilB = series.filter((s) => t(s) <= t(b)).pop()?.scores.oiliness;
    const shinier = oilA != null && oilB != null && oilA - oilB >= 5;
    const fromHealth = a.health != null;
    out.push({
      key: "sleep",
      at: t(a),
      date: `${shortDate(a)} – ${shortDate(b).split(" ")[1]} · Short sleep`,
      title: shinier ? "Shinier skin" : "Short on sleep",
      source: fromHealth ? "Apple Health · Sleep" : "Your check-in",
      icon: fromHealth ? "heart" : "note-pencil",
      scanId: b.id,
      window: { kind: "span", from: t(a), to: t(b), key: "oiliness" },
    });
  }

  // No trip or health data: mark the lowest point of the main area and what
  // the person logged around it (manual check-ins).
  if (!out.length && series.length >= 4) {
    const low = series.reduce((m, s) => (s.scores.overall < m.scores.overall ? s : m), series[0]);
    const peak = Math.max(...series.filter((s) => t(s) < t(low)).map((s) => s.scores.overall), 0);
    if (peak - low.scores.overall >= 4 && low !== series[series.length - 1]) {
      const c = low.checkin;
      out.push({
        key: "dip",
        at: t(low),
        date: shortDate(low),
        title: `Lowest score of the period (${low.scores.overall})`,
        source: c ? `Your check-in · ${c.sleepHours}h sleep, stress ${c.stress}/5` : "No check-in that day",
        icon: "note-pencil",
        scanId: low.id,
      });
      const after = series.find((s) => t(s) > t(low) && s.scores.overall >= peak);
      if (after)
        out.push({ key: "recover", at: t(after), date: shortDate(after), title: `Back to ${after.scores.overall}`, source: "Your scans", icon: "note-pencil", highlight: true, scanId: after.id });
    }
  }

  return out
    .sort((a, b) => a.at - b.at)
    .slice(0, 5)
    .map(({ at: _at, ...e }) => ({ ...e, change: e.window && changeFor(series, e.window) }));
}

const useWindow = (p: Product): EventWindow => ({ kind: "use", from: Date.parse(p.startDate + "T00:00:00Z"), to: p.endDate ? Date.parse(p.endDate + "T23:59:59Z") : Infinity });

/** Which score moved around an event, on one area's scans (sorted by time). */
export function changeFor(series: Scan[], w: EventWindow): TimelineEvent["change"] {
  if (w.kind === "use") {
    const m = moveIn(series.filter((s) => t(s) >= w.from && t(s) <= w.to));
    return m ? { label: metricLabel(m.key), from: m.from, to: m.to } : undefined;
  }
  if (w.kind === "after") {
    // Before and after must both sit close to the day, or a gap in scanning gets the credit.
    const before = series.filter((s) => t(s) < w.at).pop();
    return before && w.at - t(before) <= 3 * DAY ? moved(series, w.at, firstFrom(series, w.at)) : undefined;
  }
  const inside = series.filter((s) => t(s) >= w.from - (w.kind === "worst" ? DAY : 0) && t(s) <= w.to);
  if (!inside.length) return undefined;
  const after = w.kind === "worst" ? inside.reduce((m, s) => ((s.scores[w.key] ?? 101) < (m.scores[w.key] ?? 101) ? s : m)) : inside[inside.length - 1];
  return moved(series, w.from, after, w.key);
}

// How a score moved across an event: the last scan before it against `after`.
// With no key, the score that moved most is picked. No scans either side means
// no number ("No scan"); a small move is still shown as it is.
function moved(series: Scan[], at: number, after: Scan | undefined, key?: MetricKey): TimelineEvent["change"] {
  const before = series.filter((s) => t(s) < at).pop();
  if (!before || !after || after === before) return undefined;
  const keys = key ? [key] : METRICS.map((m) => m.key);
  const best = keys
    .map((k) => ({ k, a: before.scores[k], b: after.scores[k] }))
    .filter((x): x is { k: MetricKey; a: number; b: number } => x.a != null && x.b != null)
    .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a))[0];
  if (!best) return undefined;
  return { label: metricLabel(best.k), from: best.a, to: best.b };
}

// The first main-area scan on or after a moment, within two days; with a gap in
// scanning there's nothing honest to compare.
const firstFrom = (series: Scan[], at: number, days = 2) => series.find((s) => t(s) >= at - DAY / 2 && t(s) <= at + days * DAY);

// The closest scan with a note within a day and a half, else the closest scan within two days.
function scanNear(scans: Scan[], at: number) {
  const near = scans.filter((s) => Math.abs(t(s) - at) <= 2 * DAY).sort((a, b) => Math.abs(t(a) - at) - Math.abs(t(b) - at));
  return near.find((s) => s.annotation?.note && Math.abs(t(s) - at) <= 1.5 * DAY) ?? near[0];
}

function longestRun(subset: Scan[], all: Scan[]) {
  let best: Scan[] = [], cur: Scan[] = [];
  for (const s of all) {
    if (subset.includes(s)) cur.push(s);
    else { if (cur.length > best.length) best = cur; cur = []; }
  }
  return cur.length > best.length ? cur : best;
}

function mode(xs: string[]) {
  const c = new Map<string, number>();
  xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// ---------- next month ----------
// Next month's plan: only things we can remind her about, each with its moment.
// Timing (9 PM, UV 6+, 10:30 PM) is our assumption, listed in SUBMISSION.md.
function planSteps(events: TimelineEvent[], products: ProductRow[] | null, scans: Scan[], area: string, next: string): PlanStep[] {
  const meta = extras.products as Record<string, { verb?: string }>;
  const steps: PlanStep[] = [{ title: `Scan your ${area.toLowerCase()}`, when: `${next} · Morning` }];
  const best = products?.find((p) => p.status === "In use" && p.effect.tone === "better");
  if (best) {
    const name = meta[best.id]?.verb ?? best.name;
    steps.push({ title: name[0].toUpperCase() + name.slice(1), when: "Every night · 9 PM" });
  }
  if (events.some((e) => e.key === "trip")) steps.push({ title: "Sunscreen", when: "Sunny mornings · UV 6+" });
  if (events.some((e) => e.key === "sleep")) steps.push({ title: "Wind down by 11", when: "After short nights · 10:30 PM" });
  if (!scans.some((s) => s.health || s.checkin)) steps.push({ title: "Add a check-in", when: "After each scan" });
  return steps.slice(0, 4);
}

function askChips(events: TimelineEvent[]) {
  const trip = events.find((e) => e.key === "trip");
  const started = events.find((e) => e.key.endsWith("-start"));
  const chips: string[] = [];
  if (trip) chips.push(`Why was I redder in ${trip.date.split("· ")[1].replace(" trip", "")}?`);
  if (started) chips.push(`How long should I use ${started.title.replace("Started ", "")}?`);
  if (!chips.length) chips.push("What should I focus on next?", "When should I scan next?");
  return chips;
}
