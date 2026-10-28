"use client";

import { useEffect, useRef, useState } from "react";
import type { MetricKey, Scan, SkinReport } from "@/lib/types";
import { METRICS, shortDate, timeOfDay, type Ingredient, type ReportView, type Suggestion } from "@/lib/model";
import { areaOverview, areaScans, comparePair, lumiAnswer, previousScan, productMarkers, series } from "@/lib/detail";
import { AlertGlyph, CheckGlyph, Icon } from "./Icon";
import { AreaThumb } from "./AreaThumb";
import { LineChart } from "./LineChart";
import { Lumi } from "./Lumi";
import type { Go } from "./useRoute";

export interface Ctx {
  report: SkinReport;
  v: ReportView;
  go: Go;
  /** Swap the current screen without adding a history step (e.g. next scan). */
  back: () => void;
  toast: (text: string) => void;
}

export type Resolved = { kind: "page" | "sheet"; node: React.ReactNode } | null;

/** Turns a hash route into the screen it names. Unknown routes fall back to the report. */
export function resolve(route: string, c: Ctx): Resolved {
  const cut = route.indexOf("?");
  const path = cut < 0 ? route : route.slice(0, cut);
  const query = cut < 0 ? "" : route.slice(cut + 1);
  const [name, ...rest] = path.split("/");
  const arg = rest.join("/");
  const page = (node: React.ReactNode): Resolved => ({ kind: "page", node });
  switch (name) {
    case "score":
      return { kind: "sheet", node: <ScoreSheet c={c} /> };
    case "share":
      return { kind: "sheet", node: <ShareSheet c={c} /> };
    case "scan": {
      const scan = c.v.scans.find((s) => s.id === arg);
      return scan ? page(<ScanScreen c={c} scan={scan} />) : null;
    }
    case "area":
      return areaScans(c.v, arg).length ? page(<AreaScreen c={c} area={arg} />) : null;
    case "metric": {
      // metric/hydration, or metric/hydration/Forehead for an area other than the main one.
      const [key, ...where] = arg.split("/");
      const area = where.join("/") || c.v.primaryArea;
      const m = c.v.metrics.find((x) => x.key === key);
      return m && areaScans(c.v, area).length ? page(<MetricScreen c={c} metricKey={m.key} area={area} />) : null;
    }
    case "notes":
      return page(<NotesScreen c={c} />);
    case "product": {
      const p = c.report.products?.find((x) => x.id === arg);
      return p ? page(<ProductScreen c={c} id={p.id} />) : null;
    }
    case "pick": {
      const p = c.v.recommendation?.items[Number(arg || 0)];
      return p ? page(<PickScreen c={c} p={p} />) : null;
    }
    case "ask":
      // The question is the rest of the route; it may itself contain "?".
      return page(<AskScreen c={c} first={query.startsWith("q=") ? query.slice(2) : undefined} />);
    default:
      return null;
  }
}

// ---------- shells ----------
function Page({ title, c, children, footer }: { title: React.ReactNode; c: Ctx; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <>
      <header className="nav sub-nav">
        <button className="icon-btn back" onClick={c.back} aria-label="Back">
          <Icon name="caret-left" size={22} />
        </button>
        {typeof title === "string" ? <h1>{title}</h1> : title}
      </header>
      <main className="page sub-page">{children}</main>
      {footer}
    </>
  );
}

function Sheet({ title, c, children }: { title: string; c: Ctx; children: React.ReactNode }) {
  // Move focus into the sheet, so the button that opened it doesn't keep a focus ring.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div ref={ref} tabIndex={-1} className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <span className="grabber" aria-hidden="true" />
      <header className="sheet-head">
        <h2>{title}</h2>
        <button className="icon-btn close" onClick={c.back} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
      </header>
      {children}
    </div>
  );
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;

/** The score layout used everywhere: big number on the left; its band and its
 *  change ("vs a month ago +8") stacked on the right, the coloured parts on the right edge. */
export function ScoreHead({ value, d, label, name }: { value: number | null; d: number | null | undefined; label: string; name?: string }) {
  const band = value == null ? null : value >= 70 ? "Good" : value >= 40 ? "Okay" : "Needs care";
  return (
    <div className="row-split">
      <span className="score-num" style={name ? { viewTransitionName: name } : undefined}>
        {value ?? "—"}
      </span>
      <span className="row-stack">
        {band && <span className={`score-band ${band === "Good" ? "good" : band === "Okay" ? "okay" : "care"}`}>{band}</span>}
        {d != null && (
          <span className="score-change">
            {label} <b className={d < 0 ? "care" : d === 0 ? "" : "good"}>{d === 0 ? "0" : signed(d)}</b>
          </span>
        )}
      </span>
    </div>
  );
}

function DeltaPill({ d }: { d: number | null | undefined }) {
  if (d == null || d === 0) return <span className="pill none">{d === 0 ? "0" : "—"}</span>;
  return <span className={`pill ${d < 0 ? "care" : ""}`}>{signed(d)}</span>;
}

// ---------- score explainer ----------
function ScoreSheet({ c }: { c: Ctx }) {
  const { v } = c;
  return (
    <Sheet title="Your skin score" c={c}>
      <p className="sheet-lead">
        Out of 100, higher is healthier. That holds for every score: even for Redness and Oiliness, a high score means less of it. Each area gets its own score from its latest scan, because skin differs from spot to spot. The +/− beside it compares with that area's first scan this month.
      </p>
      <div className="card list flat">
        {v.areas.map((a) => (
          <div key={a.name} className="row">
            <AreaThumb v={v} area={a.name} />
            <span className="area-main">
              <b>{a.name}</b>
              <small>{shortDate(a.latest)}</small>
            </span>
            <span className="area-score">{a.latest.scores.overall}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <Scale value={areaOverview(v, v.primaryArea).score} />
      </div>
    </Sheet>
  );
}

// ---------- share ----------
function ShareSheet({ c }: { c: Ctx }) {
  const { v } = c;
  const main = areaOverview(v, v.primaryArea);
  const url = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "My skin report", url });
      else {
        await navigator.clipboard.writeText(url);
        c.toast("Link copied");
      }
    } catch {
      /* the person closed the share sheet */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      c.toast("Link copied");
    } catch {
      c.toast("Couldn't copy the link");
    }
  };
  return (
    <Sheet title="Share this month" c={c}>
      <div className="share-card">
        <small>
          {v.firstName}'s skin score · {v.primaryArea}
        </small>
        <ScoreHead value={main.score} d={main.delta} label={main.deltaLabel} />
        <small>Only your score is shared. Photos stay private.</small>
      </div>
      <div className="sheet-actions">
        <button className="btn primary" onClick={share}>
          Share
        </button>
        <button className="btn ghost" onClick={copy}>
          <Icon name="link" size={18} /> Copy link
        </button>
      </div>
    </Sheet>
  );
}

// ---------- one scan ----------
const LIGHTS = [
  { key: "ambient", label: "Normal", note: "How your skin looks to the eye." },
  { key: "polarized", label: "Polarized", note: "Glare removed, so redness and spots under the surface show." },
  { key: "uva", label: "UV", note: "Oil glows under UV light." },
] as const;
type Light = (typeof LIGHTS)[number]["key"];

function Lights({ value, onChange }: { value: Light; onChange: (l: Light) => void }) {
  return (
    <>
      <div className="segmented" role="tablist" aria-label="Light">
        {LIGHTS.map((l) => (
          <button key={l.key} role="tab" aria-selected={value === l.key} className={value === l.key ? "on" : ""} onClick={() => onChange(l.key)}>
            {l.label}
          </button>
        ))}
      </div>
      <p className="light-note">{LIGHTS.find((l) => l.key === value)!.note}</p>
    </>
  );
}

const photoOf = (s: Scan, light: Light) => (s.photos ? s.photos[light] : s.photoUrl);

function Photo({ scan, light, className = "" }: { scan: Scan; light: Light; className?: string }) {
  const src = photoOf(scan, light);
  return src ? (
    <div
      className={`photo ${src.endsWith(".svg") ? "placeholder" : ""} ${className}`}
      style={{ backgroundImage: `url(${src})` }}
      role="img"
      aria-label={`${scan.area}, ${shortDate(scan)}`}
    />
  ) : (
    <div className={`photo missing ${className}`}>Photo didn't upload</div>
  );
}

function ScanScreen({ c, scan }: { c: Ctx; scan: Scan }) {
  const { v } = c;
  const [light, setLight] = useState<Light>("ambient");
  const prev = previousScan(v, scan);
  const d = prev ? scan.scores.overall - prev.scores.overall : null;
  const a = scan.annotation;
  // What else was true that day, as labelled values rather than one long line.
  const env = scan.location?.environment;
  const sleep = scan.health?.sleepHours ?? scan.checkin?.sleepHours;
  const stats = [
    sleep != null && { label: "Sleep", value: `${sleep}h` },
    scan.checkin && { label: "Stress", value: `${scan.checkin.stress}/5` },
    scan.health && { label: "Cycle", value: `Day ${scan.health.cycleDay}` },
    env && { label: "UV", value: `${env.uvIndexMax}` },
    env && { label: "Humidity", value: `${env.humidityPct}%` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Page title={shortDate(scan)} c={c}>
      <div className="card padded photo-card">
        <Photo scan={scan} light={light} />
        {scan.photos && <Lights value={light} onChange={setLight} />}
      </div>

      <section className="card padded scan-read">
        <small className="scan-meta">
          {scan.area} · {timeOfDay(scan)}
        </small>
        <ScoreHead value={scan.scores.overall} d={d} label={prev ? `vs ${shortDate(prev)}` : ""} />
        <p className="obs">{scan.summary.observations.join(" ")}</p>
      </section>

      <section className="section">
      <h2>Breakdown</h2>
      <div className="card list">
        {METRICS.map((m) => {
          const val = scan.scores[m.key];
          const pv = prev?.scores[m.key];
          return (
            <div key={m.key} className="row metric">
              <span className={`tile tile-${m.key}`}>
                <Icon name={m.icon} size={20} />
              </span>
              <span className="metric-label grow">{m.label}</span>
              <span className="metric-value">{val ?? <small>Not measured</small>}</span>
              {prev && <DeltaPill d={val != null && pv != null ? val - pv : null} />}
            </div>
          );
        })}
      </div>
      </section>

      {(a?.note || a?.tags.length || stats.length > 0) && (
        <section className="section">
          <h2>That day</h2>
          <div className="card padded day">
            {a?.note && <p className="quote">“{a.note}”</p>}
            {!!a?.tags.length && (
              <div className="chips">
                {a.tags.map((t) => (
                  <span key={t} className="chip grey">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {stats.length > 0 && (
              <>
                {scan.location && <small>{scan.location.city}</small>}
                <dl className="stats">
                  {stats.map((x) => (
                    <div key={x.label}>
                      <dt>{x.label}</dt>
                      <dd>{x.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        </section>
      )}
    </Page>
  );
}

// ---------- one area ----------
function AreaScreen({ c, area }: { c: Ctx; area: string }) {
  const { v, report } = c;
  const list = areaScans(v, area);
  const latest = list[list.length - 1];
  const summary = v.areas.find((a) => a.name === area)!;
  const data = series(list, "overall");
  const pair = comparePair(list);
  const [light, setLight] = useState<Light>("ambient");
  const both = pair && pair[0].photos && pair[1].photos;
  // The report's hero chart is this area's chart: let it carry over.
  const shared = area === v.primaryArea;

  return (
    <Page title={area} c={c}>
      <section className="card hero">
        <ScoreHead value={latest.scores.overall} d={summary.delta} label={`since ${shortDate(summary.first)}`} name={shared ? "score" : undefined} />
        {data ? (
          <LineChart
            data={data}
            markers={shared ? productMarkers(report) : []}
            label={`${area} score over time`}
            onPick={(s) => c.go(`scan/${s.id}`)}
            name={shared ? "trend" : undefined}
          />
        ) : (
          <p className="unlock">One more scan here to see a trend.</p>
        )}
      </section>

      {!pair && latest.photoUrl && (
        <section className="section">
          <h2>Latest photo</h2>
          <button className="card padded photo-card single" onClick={() => c.go(`scan/${latest.id}`)}>
            <Photo scan={latest} light="ambient" />
          </button>
        </section>
      )}

      {pair && (
        <section className="section">
          <h2>First vs latest</h2>
          <div className="card padded">
            <div className="compare">
              {pair.map((s) => (
                <button key={s.id} onClick={() => c.go(`scan/${s.id}`)}>
                  <Photo scan={s} light={both ? light : "ambient"} />
                  <span>
                    <small>{shortDate(s)}</small>
                    <b>{s.scores.overall}</b>
                  </span>
                </button>
              ))}
            </div>
            {both && <Lights value={light} onChange={setLight} />}
          </div>
        </section>
      )}

      <section className="section">
        <h2>All scans</h2>
        <div className="card list">
          {[...list].reverse().map((s) => {
            const p = previousScan(v, s);
            return (
              <button key={s.id} className="row" onClick={() => c.go(`scan/${s.id}`)}>
                <span className="area-main">
                  <b>{shortDate(s)}</b>
                  <small className="clamp">{s.annotation?.note ?? timeOfDay(s)}</small>
                </span>
                <span className="area-score">{s.scores.overall}</span>
                <DeltaPill d={p ? s.scores.overall - p.scores.overall : null} />
                <Icon name="caret-right" size={14} className="caret" />
              </button>
            );
          })}
        </div>
      </section>
    </Page>
  );
}

// ---------- one metric ----------
const DAY = 86_400_000;

function MetricScreen({ c, metricKey, area }: { c: Ctx; metricKey: MetricKey; area: string }) {
  const { v } = c;
  const o = areaOverview(v, area);
  const m = o.metrics.find((x) => x.key === metricKey)!;
  const list = o.list;
  const data = series(list, metricKey);
  const pts = data?.points ?? [];
  const high = pts.length ? pts.reduce((a, b) => (b.value >= a.value ? b : a)) : null;
  const low = pts.length ? pts.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const byArea = v.areas.map((a) => {
    const l = areaScans(v, a.name).filter((s) => s.scores[metricKey] != null);
    const first = l[0], last = l[l.length - 1];
    const d = l.length >= 2 && Date.parse(last.takenAt) - Date.parse(first.takenAt) >= 7 * DAY ? last.scores[metricKey]! - first.scores[metricKey]! : null;
    return { name: a.name, value: last?.scores[metricKey] ?? null, d };
  });

  return (
    <Page title={m.label} c={c}>
      {/* The same card as the report's score: the number, its trend, then the high and low. */}
      <section className="card hero">
        <span className="hero-label">{area}</span>
        <ScoreHead value={m.value} d={m.delta} label={o.deltaLabel} />
        {m.value == null && <p className="obs">Your recent scans couldn't measure this.</p>}
        {data && high && low && (
          <>
            <LineChart data={data} label={`${m.label} on ${area}`} onPick={(s) => c.go(`scan/${s.id}`)} />
            <div className="extremes">
              {[
                { k: "Highest", p: high },
                { k: "Lowest", p: low },
              ].map(({ k, p }) => (
                <button key={k} onClick={() => c.go(`scan/${p.scan.id}`)}>
                  <small>{k}</small>
                  <b>{p.value}</b>
                  <small>{shortDate(p.scan)}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {byArea.length > 1 && (
        <section className="section">
          <h2>By area</h2>
          <div className="card list">
            {byArea.map((a) => (
              <button key={a.name} className="row" onClick={() => c.go(`area/${a.name}`)}>
                <AreaThumb v={v} area={a.name} />
                <span className="area-main">
                  <b>{a.name}</b>
                </span>
                <span className="area-score">{a.value ?? "—"}</span>
                <DeltaPill d={a.d} />
                <Icon name="caret-right" size={14} className="caret" />
              </button>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

// Where a score sits in the three bands, with their names.
function Scale({ value }: { value: number }) {
  return (
    <div className="scale">
      <span className="band wide" aria-hidden="true">
        <i />
        <i />
        <i />
        <b style={{ left: `${value}%` }} />
      </span>
      <div className="legend-labels">
        <span>Needs care</span>
        <span>Okay</span>
        <span>Good</span>
      </div>
    </div>
  );
}

// ---------- notes ----------
function NotesScreen({ c }: { c: Ctx }) {
  const notes = [...c.v.scans].reverse().filter((s) => s.annotation?.note);
  return (
    <Page title="Your notes" c={c}>
      <div className="card list">
        {notes.map((s) => (
          <button key={s.id} className="row note" onClick={() => c.go(`scan/${s.id}`)}>
            <span className="area-main">
              <small>
                {shortDate(s)} · {s.area}
              </small>
              <span className="note-text">{s.annotation!.note}</span>
            </span>
            <Icon name="caret-right" size={14} className="caret" />
          </button>
        ))}
      </div>
    </Page>
  );
}

// ---------- one product ----------
function ProductScreen({ c, id }: { c: Ctx; id: string }) {
  const { v, report } = c;
  const p = report.products!.find((x) => x.id === id)!;
  const row = v.products!.find((x) => x.id === id)!;
  // Her own notes that mention it ("First night of azelaic acid. Felt fine.").
  const words = [p.name.split(" ")[0], ...p.keyIngredients.map((k) => k.split(" ")[0]), p.category].map((w) => w.toLowerCase());
  const notes = v.scans.filter((s) => words.some((w) => s.annotation?.note?.toLowerCase().includes(w)));
  return (
    <Page title={row.name} c={c}>
      <section className="card padded product-hero">
        <span className="pimg huge" style={{ backgroundImage: row.image ? `url(${row.image})` : undefined }} />
        <b>{p.name}</b>
        <small>
          {p.category} · {p.usage}
        </small>
        <small>{p.keyIngredients.join(" · ")}</small>
        <span className={`status ${row.status === "Stopped" ? "off" : ""}`}>{row.status}</span>
      </section>

      {p.stoppedReason && (
        <section className="section">
          <h2>Why you stopped</h2>
          <div className="card padded">
            <p className="quote">“{p.stoppedReason}”</p>
          </div>
        </section>
      )}

      {row.ingredients.length > 0 && <ForYourSkin items={row.ingredients} />}

      {notes.length > 0 && (
        <section className="section">
          <h2>Your notes</h2>
          <div className="card list">
            {notes.map((s) => (
              <button key={s.id} className="row note" onClick={() => c.go(`scan/${s.id}`)}>
                <span className="area-main">
                  <small>{shortDate(s)}</small>
                  <span className="note-text">{s.annotation!.note}</span>
                </span>
                <Icon name="caret-right" size={14} className="caret" />
              </button>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}

// What is in a product and whether it suits her: the same list for what she uses and what we suggest.
function ForYourSkin({ items }: { items: Ingredient[] }) {
  return (
    <section className="section">
      <h2>For your skin</h2>
      <div className="card list">
        {items.map((i) => (
          <div key={i.name} className="row">
            <span className={`mark ${i.ok ? "" : "warn"}`}>{i.ok ? <CheckGlyph size={14} /> : <AlertGlyph size={14} />}</span>
            <span className="area-main">
              <b>{i.name}</b>
              <small>{i.why}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- why we picked it ----------
function PickScreen({ c, p }: { c: Ctx; p: Suggestion }) {
  return (
    <Page
      title="Why it suits you"
      c={c}
      footer={
        <div className="footer-cta">
          <a className="btn primary" href={p.url} target="_blank" rel="noreferrer">
            Buy now · ${p.price.toFixed(2)}
          </a>
        </div>
      }
    >
      <section className="card padded product-hero">
        <span className="pimg huge" style={{ backgroundImage: `url(${p.image})` }} />
        <small className="brand">{p.brand}</small>
        <b>{p.name}</b>
      </section>
      <ForYourSkin items={p.ingredients} />
      {p.research && (
        <a className="card padded research" href={p.research.url} target="_blank" rel="noreferrer">
          <span>
            <small>Research</small>
            <b>{p.research.label}</b>
          </span>
          <Icon name="arrow-square-out" size={18} />
        </a>
      )}
    </Page>
  );
}

// ---------- Lumi ----------
type Msg = { from: "lumi" | "me"; text: string };

function AskScreen({ c, first }: { c: Ctx; first?: string }) {
  const { v, report } = c;
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "lumi", text: `Hi ${v.firstName}, anything you'd like to ask about this month?` }]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const asked = useRef(new Set<string>());
  const end = useRef<HTMLDivElement>(null);

  const ask = (q: string) => {
    if (!q.trim() || typing) return;
    asked.current.add(q);
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setDraft("");
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { from: "lumi", text: lumiAnswer(report, v, q) }]);
      setTyping(false);
    }, 900);
  };

  useEffect(() => {
    if (first && !asked.current.size) ask(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  const chips = [...v.askChips, "What should I focus on next?", "When should I scan next?"].filter((q, i, all) => all.indexOf(q) === i && !asked.current.has(q)).slice(0, 3);

  return (
    <Page
      title="Lumi"
      c={c}
      footer={
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask Lumi…" aria-label="Ask Lumi" enterKeyHint="send" />
          <button className="send" aria-label="Send" disabled={!draft.trim()}>
            <Icon name="arrow-up" size={16} />
          </button>
        </form>
      }
    >
      <div className="chat-hero">
        <Lumi size={88} />
      </div>
      <div className="chat">
        {msgs.map((m, i) => (
          <p key={i} className={`msg ${m.from}`}>
            {m.text}
          </p>
        ))}
        {typing && (
          <p className="msg lumi typing" aria-label="Lumi is typing">
            <i />
            <i />
            <i />
          </p>
        )}
        {!typing && chips.length > 0 && (
          <div className="chips">
            {chips.map((q) => (
              <button key={q} className="chip outline" onClick={() => ask(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>
    </Page>
  );
}
