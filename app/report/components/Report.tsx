"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SkinReport } from "@/lib/types";
import { buildView, shortDate, type ReportView } from "@/lib/model";
import { CheckGlyph, Icon, InfoGlyph } from "./Icon";
import { Lumi } from "./Lumi";
import { resolve, type Ctx } from "./Screens";
import { LineChart } from "./LineChart";
import { areaOverview, eventChange } from "@/lib/detail";
import { useRoute, type Go } from "./useRoute";
import confetti from "canvas-confetti";

const monthName = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(iso));

export function Report({ report }: { report: SkinReport }) {
  const v = useMemo(() => buildView(report), [report]);
  const title = `${monthName(report.period?.end ?? v.latest.takenAt)} report`;
  const { route, go, back } = useRoute();
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((text: string) => {
    setToastText(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(null), 2200);
  }, []);
  const ctx: Ctx = { report, v, go, back, toast };

  // "Report ready" moment: two party cannons fire from the bottom corners up toward
  // the middle, peak around the score card, then drift down. Skipped for reduced motion and when the link opens straight onto a
  // second-level screen.
  useEffect(() => {
    if (window.location.hash || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#4a52d6", "#8f95ff", "#c7c9ff", "#f4a261", "#ffd6a5"];
    const t = setTimeout(() => {
      // Fast and steep enough to peak over the first card, near the top of the screen.
      const burst = { particleCount: 45, spread: 45, startVelocity: 72, gravity: 0.9, ticks: 280, scalar: 0.85, colors };
      const dots = { particleCount: 15, spread: 55, startVelocity: 64, gravity: 0.8, ticks: 260, scalar: 0.6, shapes: ["circle" as const], colors };
      confetti({ ...burst, angle: 66, origin: { x: 0, y: 1 } });
      confetti({ ...dots, angle: 66, origin: { x: 0, y: 1 } });
      confetti({ ...burst, angle: 114, origin: { x: 1, y: 1 } });
      confetti({ ...dots, angle: 114, origin: { x: 1, y: 1 } });
    }, 450);
    return () => clearTimeout(t);
  }, []);
  // Pages cover the report and it fades back; sheets keep it visible behind a scrim.
  const covered = route ? resolve(route, ctx)?.kind === "page" : false;

  return (
    <>
      <main className={`page ${covered ? "covered" : ""}`} aria-hidden={route ? true : undefined}>
        <header className="nav">
          <h1>{title}</h1>
          <button className="icon-btn" aria-label="Share this month" onClick={() => go("share")}>
            <Icon name="share-network" size={22} />
          </button>
        </header>

        <Overview v={v} go={go} live={!route} />


        {(v.products || v.recommendation) && (
          <Section title="Skincare">
            <div className="card list">
              {v.products && <Products v={v} go={go} />}
              {v.recommendation && <TryNext v={v} go={go} />}
            </div>
          </Section>
        )}

        <Section title={`${nextMonthName(v)} plan`}>
          <NextMonth v={v} toast={toast} />
        </Section>

        <Section title="Ask Lumi">
          <LumiCard v={v} go={go} />
        </Section>

        <TabBar toast={toast} />
      </main>

      <Overlay route={route} ctx={ctx} />

      <div className={`toast ${toastText ? "on" : ""}`} role="status" aria-live="polite">
        {toastText}
      </div>
    </>
  );
}

// Second-level screens slide over the report, which stays mounted underneath
// so its scroll position survives. Leaving screens animate out before unmounting.
function Overlay({ route, ctx }: { route: string; ctx: Ctx }) {
  const trail = useRef<string[]>([""]);
  const [leaving, setLeaving] = useState<{ route: string; pop: boolean } | null>(null);
  const prev = useRef(route);

  useEffect(() => {
    const from = prev.current;
    if (from === route) return;
    prev.current = route;
    const t = trail.current;
    // Going back to anything already in the trail is a pop; a swapped screen replaces the last step.
    const at = t.indexOf(route);
    const pop = route === "" || at >= 0;
    if (route === "") trail.current = [""];
    else if (pop) t.length = at + 1;
    else t.push(route);
    // A view transition is animating this change already.
    if (document.documentElement.dataset.vt) return setLeaving(null);
    setLeaving({ route: from, pop });
    const id = setTimeout(() => setLeaving(null), 360);
    return () => clearTimeout(id);
  }, [route]);

  useEffect(() => {
    document.body.style.overflow = route ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [route]);

  const current = route ? resolve(route, ctx) : null;
  const old = leaving?.route ? resolve(leaving.route, ctx) : null;
  const layer = (r: NonNullable<ReturnType<typeof resolve>>, key: string, cls: string) =>
    r.kind === "sheet" ? (
      <div key={key} className={`layer sheet-layer ${cls}`}>
        <div className="backdrop" onClick={ctx.back} />
        {r.node}
      </div>
    ) : (
      <div key={key} className={`layer page-layer ${cls}`}>
        {r.node}
      </div>
    );

  // Unknown route (e.g. a stale link): quietly show the report.
  if (route && !current && !old) return null;
  return (
    <>
      {old && leaving && !leaving.pop && layer(old, "old:" + leaving.route, "under")}
      {current && layer(current, route, !leaving ? "" : leaving.pop ? "reveal" : "enter")}
      {old && leaving && leaving.pop && layer(old, "old:" + leaving.route, "exit")}
    </>
  );
}

function Section({ title, onInfo, children }: { title: string; onInfo?: () => void; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2>
        {title}
        {onInfo && (
          <button className="h2-info" onClick={onInfo} aria-label={`${title}: how scores work`}>
            <InfoGlyph size={18} />
          </button>
        )}
      </h2>
      {children}
    </section>
  );
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;

// ---------- hero ----------
// One block for the skin itself: pick an area, and its score, trend, five scores
// and latest read all follow (score first, then what makes it up, then details). Areas aren't comparable, so there's no
// made-up whole-face number.
function Overview({ v, go, live }: { v: ReportView; go: Go; live: boolean }) {
  const [area, setArea] = useState(v.primaryArea);
  const a = areaOverview(v, area);
  // Non-breaking hyphen so "T-zone" never splits across lines.
  const obs = a.latest.summary.observations.join(" ").replace(/(\w)-(\w)/g, "$1\u2011$2");
  const main = area === v.primaryArea && live;
  const d = a.delta;
  const band = a.score >= 70 ? "Good" : a.score >= 40 ? "Okay" : "Needs care";

  const tabs = v.areas.length > 1 && (
    <div className="segmented area-tabs" role="tablist" aria-label="Area">
      {v.areas.map((x) => (
        <button key={x.name} role="tab" aria-selected={x.name === area} className={x.name === area ? "on" : ""} onClick={() => setArea(x.name)}>
          {x.name}
        </button>
      ))}
    </div>
  );
  // Score card, Stocks-style: the number, its band and its change on one line, the
  // month's trend right under it, then the scan's own read (headline + what it saw).
  const bandEl = <span className={`score-band ${band === "Good" ? "good" : band === "Okay" ? "okay" : "care"}`}>{band}</span>;
  const num = (
    <span className="score-num" style={main ? { viewTransitionName: "score" } : undefined}>
      {a.score}
    </span>
  );
  // The change reads "vs a month ago  +8", so the coloured parts (band, +8) line up on the right edge.
  const change = (
    <span className="score-change">
      {d == null ? (
        `${a.list.length === 1 ? "First scan" : "Latest scan"} · ${shortDate(a.latest)}`
      ) : (
        <>
          {a.deltaLabel} <b className={d < 0 ? "care" : d === 0 ? "" : "good"}>{d === 0 ? "0" : signed(d)}</b>
        </>
      )}
    </span>
  );
  // Score card: the number on the left; its band and change stacked on the right.
  const score = (
    <>
      <button className="hero-label" onClick={() => go("score")} aria-label="Skin score: how it works">
        Skin score
        <InfoGlyph size={16} />
      </button>
      <div className="row-split">
        {num}
        <span className="row-stack">
          {bandEl}
          {change}
        </span>
      </div>
    </>
  );
  const chart = a.trend ? (
    <button className="chart-btn" onClick={() => go(`area/${area}`)} aria-label={`${area} over the month`}>
      <LineChart data={a.trend} label={`${area} skin score over the month`} name={main ? "trend" : undefined} />
    </button>
  ) : (
    <button className="unlock" onClick={() => go(`area/${area}`)}>
      {3 - a.list.length} more {area.toLowerCase()} scan{3 - a.list.length === 1 ? "" : "s"} to see a trend.
    </button>
  );
  const metrics = a.metrics.map((m) => (
    <button key={m.key} className="row metric" onClick={() => go(area === v.primaryArea ? `metric/${m.key}` : `metric/${m.key}/${area}`)}>
      <span className={`tile tile-${m.key}`}>
        <Icon name={m.icon} size={20} />
      </span>
      <span className="metric-main">
        <span className="metric-label">{m.label}</span>
        {m.value != null && (
          <span className="band" aria-hidden="true">
            <i />
            <i />
            <i />
            <b style={{ left: `${m.value}%` }} />
          </span>
        )}
      </span>
      <span className="metric-value">{m.value ?? <small>Not measured</small>}</span>
      {m.delta != null && <span className={`pill ${m.delta < 0 ? "care" : m.delta === 0 ? "none" : ""}`}>{m.delta === 0 ? "0" : signed(m.delta)}</span>}
    </button>
  ));
  const read = (
    <div className="score-read">
      <b>{a.latest.summary.headline}</b>
      <p>{obs}</p>
      <button className="link" onClick={() => go(`scan/${a.latest.id}`)}>
        Details ›
      </button>
    </div>
  );

  // The area switch sticks under the header while the blocks it drives are on
  // screen, so it names the area for all of them.
  return (
    <div className="area-block">
      {tabs && (
        <div className="page-tabs sticky">
          {tabs}
        </div>
      )}
      <section className="card hero" aria-label="Skin score">
        {score}
        {chart}
        {read}
      </section>
      <Section title="Breakdown" onInfo={() => go("score")}>
        <div className="card list">{metrics}</div>
      </Section>
      <Section title="What changed">
        <WhatChanged v={v} go={go} area={area} />
      </Section>
    </div>
  );
}

// ---------- what changed ----------
function WhatChanged({ v, go, area }: { v: ReportView; go: Go; area: string }) {
  // Life events apply to every area; ones read off the main area's own scores (lowest day) don't.
  const events = area === v.primaryArea ? v.events : v.events.filter((e) => e.window);
  if (!events.length)
    return (
      <div className="card padded unlock-card">
        <b>See why your skin changes</b>
        <p>
          {v.scans.length < 4
            ? "After a few more scans, we'll line up your check-ins with how your scores move."
            : v.scans.some((s) => s.checkin)
              ? "No clear pattern yet. Scanning the same area more often will make one easier to see."
              : "Connect Apple Health or add a short check-in after each scan."}
        </p>
      </div>
    );
  // Every row: when, what, and where we learned it on the left. On the right, the
  // score that moved: its name on the date's line, the change on the title's line,
  // in the same pill as the scores above. Same height every row, for an even rhythm.
  return (
    <div className="card padded">
      <ol className="timeline">
        {events.map((e) => {
          // The events are the same for every area; the score that moved is the chosen area's.
          const change = eventChange(v, e, area);
          const d = change && change.to - change.from;
          return (
            <li key={e.key} className={e.highlight ? "hl" : ""}>
              {/* The row already says what happened and which score moved; the full story lives in the notes. */}
              <div className="ev-btn">
                <span className="node">
                  <Icon name={e.icon} size={13} />
                </span>
                <span className="ev">
                  <small>{e.date}</small>
                  <b>{e.title}</b>
                  {/* The date is already on the first line. */}
                  <span className="source">{e.source.replace(/ · [A-Z][a-z]{2} \d+$/, "")}</span>
                </span>
                {/* Events that are scan results themselves (lowest day, recovery) have nothing to compare. */}
                {e.window && (
                  <span className="ev-score">
                    <small>{change ? change.label : "No scan"}</small>
                    {change && d != null ? <span className={`pill ${d < 0 ? "care" : ""}`}>{signed(d)}</span> : <span className="pill none">–</span>}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {v.noteCount > 0 && (
        <button className="btn secondary" onClick={() => go("notes")}>
          See all {v.noteCount} notes
        </button>
      )}
    </div>
  );
}

// ---------- skincare ----------
// One card: what she uses as a list, then what to try next as a shelf to swipe.
function Products({ v, go }: { v: ReportView; go: Go }) {
  return (
    <>
      {v.products!.map((p) => (
        <button key={p.id} className="row product" onClick={() => go(`product/${p.id}`)}>
          <span className="pimg" style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }} />
          <span className="product-main">
            <b>{p.name}</b>
            <small>{p.since}</small>
            <small className={`effect ${p.effect.tone}`}>{p.effect.text}</small>
          </span>
          <span className={`status ${p.status === "Stopped" ? "off" : ""}`}>{p.status}</span>
        </button>
      ))}
    </>
  );
}

// All picks look the same so they are easy to compare; the order says which fits best.
function TryNext({ v, go }: { v: ReportView; go: Go }) {
  const r = v.recommendation!;
  // Lead with her own number, so the picks read as an answer to her skin, not an ad.
  const m = v.metrics.find((x) => x.key === r.forMetric);
  const fact = m?.value != null && m.delta ? `${m.label} ${m.value}, ${m.delta < 0 ? "down" : "up"} ${Math.abs(m.delta)} ${v.deltaLabel.replace("vs ", "from ")}. ` : "";
  return (
    <div className="try-next">
      <div className="try-next-head">
        <b>Try next</b>
        <small>
          {fact}
          {r.why}
        </small>
      </div>
      <div className="shelf">
        {r.items.map((p, i) => (
          <div key={p.name} className="pick-card">
            <button className="pick-main" onClick={() => go(i ? `pick/${i}` : "pick")}>
              <span className="pimg" style={{ backgroundImage: `url(${p.image})` }} />
              <b className="clamp2">{p.name}</b>
              <small>{p.brand}</small>
              <b className="price small">${p.price.toFixed(2)}</b>
            </button>
            <a className="btn buy" href={p.url} target="_blank" rel="noreferrer">
              Buy
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- next month ----------
function NextMonth({ v, toast }: { v: ReportView; toast: (t: string) => void }) {
  const [reminder, setReminder] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  // The list is the plan: ticks are kept on this device so it works as a checklist through the month.
  const key = `lumeria-plan-${v.latest.id}`;
  useEffect(() => {
    try {
      setDone(new Set(JSON.parse(localStorage.getItem(key) ?? "[]")));
    } catch {}
  }, [key]);
  const toggle = (k: string) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      try {
        localStorage.setItem(key, JSON.stringify([...n]));
      } catch {}
      return n;
    });
  return (
    <div className="card padded">
      <ul className="todo">
        {v.plan.map((s) => (
          <li key={s.title}>
            <button className="todo-row" role="checkbox" aria-checked={done.has(s.title)} onClick={() => toggle(s.title)}>
              <span className={`check ${done.has(s.title) ? "on" : ""}`}>
                <CheckGlyph size={13} weight={2.4} />
              </span>
              <span className="todo-text">
                <b>
                  {s.title}
                  <Scribble />
                </b>
                <small>{s.when}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {/* Like "See all notes": the action goes at the bottom of its card, quiet grey. */}
      <button
        className={`btn secondary ${reminder ? "on" : ""}`}
        aria-pressed={reminder}
        onClick={() => {
          setReminder(!reminder);
          toast(reminder ? "Reminders off" : "Reminders on");
        }}
      >
        {reminder ? (
          <>
            <CheckGlyph size={14} /> Reminders on
          </>
        ) : (
          `Turn on reminder${v.plan.length === 1 ? "" : "s"}`
        )}
      </button>
    </div>
  );
}

// Hand-drawn strike-through, drawn over a step when it's ticked off.
// Path and timing from Animate UI's Playful Todolist (@arhamkhnz).
function Scribble() {
  return (
    <svg className="scribble" viewBox="0 0 340 32" preserveAspectRatio="none" aria-hidden="true">
      <path
        pathLength={1}
        d="M 10 16.91 s 79.8 -11.36 98.1 -11.34 c 22.2 0.02 -47.82 14.25 -33.39 22.02 c 12.61 6.77 124.18 -27.98 133.31 -17.28 c 7.52 8.38 -26.8 20.02 4.61 22.05 c 24.55 1.93 113.37 -20.36 113.37 -20.36"
      />
    </svg>
  );
}

function nextMonthName(v: ReportView) {
  const d = new Date(v.latest.takenAt);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(d);
}

// ---------- Lumi ----------
function LumiCard({ v, go }: { v: ReportView; go: Go }) {
  return (
    <div className="card padded lumi">
      <div className="lumi-top">
        <Lumi size={56} />
        <div>
          <b>Lumi</b>
          <small>Only uses your own data.</small>
        </div>
      </div>
      <p className="bubble">Hi {v.firstName}, anything you'd like to ask about this month?</p>
      <div className="chips">
        {v.askChips.map((c) => (
          <button key={c} className="chip outline" onClick={() => go(`ask?q=${c}`)}>
            {c}
          </button>
        ))}
      </div>
      <button className="ask" onClick={() => go("ask")}>
        <span>Ask Lumi…</span>
        <span className="send" aria-hidden="true">
          <Icon name="arrow-up" size={16} />
        </span>
      </button>
    </div>
  );
}

function TabBar({ toast }: { toast: (t: string) => void }) {
  const soon = () => toast("Not part of this prototype");
  return (
    <nav className="tabbar" aria-label="App">
      <button className="on" aria-current="page">
        <Icon name="house" size={22} />
        Report
      </button>
      <button onClick={soon}>
        <Icon name="scan" size={22} />
        Scan
      </button>
      <button onClick={soon}>
        <Icon name="calendar-blank" size={22} />
        History
      </button>
    </nav>
  );
}
