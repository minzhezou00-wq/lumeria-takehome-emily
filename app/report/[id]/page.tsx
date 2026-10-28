"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SkinReport } from "@/lib/types";
import { Report } from "../components/Report";
import { DeviceFrame, useFramed } from "../components/DeviceFrame";
import "../report.css";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "missing" }
  | { kind: "ready"; report: SkinReport };

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const framed = useFramed();
  if (framed === "unknown") return null;
  if (framed === "frame") return <DeviceFrame />;
  return <ReportApp params={params} />;
}

function ReportApp({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(
    (fail = false) => {
      setState({ kind: "loading" });
      const q = fail || new URLSearchParams(window.location.search).get("fail") === "1" ? "?fail=1" : "";
      fetch(`/api/reports/${id}${q}`)
        .then(async (res) => {
          if (res.status === 404) return setState({ kind: "missing" });
          if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Something went wrong.");
          setState({ kind: "ready", report: await res.json() });
        })
        .catch((e: Error) => setState({ kind: "error", message: e.message }));
    },
    [id],
  );

  useEffect(() => load(), [load]);

  return (
    <div className="app">
      {state.kind === "loading" && <Skeleton />}
      {state.kind === "error" && (
        <Empty title="We couldn't load your report" body={state.message}>
          <button
            className="btn primary"
            onClick={() => {
              window.history.replaceState(null, "", window.location.pathname);
              load(false);
            }}
          >
            Try again
          </button>
        </Empty>
      )}
      {state.kind === "missing" && (
        <Empty title="We can't find this report" body={`There's no report called “${id}”.`}>
          <Link className="btn primary" href="/report/noor">
            Open Noor's report
          </Link>
        </Empty>
      )}
      {state.kind === "ready" && <Report report={state.report} />}
    </div>
  );
}

function Skeleton() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading your report">
      <div className="nav">
        <span className="sk sk-title" />
      </div>
      <div className="card sk-card">
        <span className="sk" style={{ width: 80, height: 14 }} />
        <span className="sk" style={{ width: 120, height: 56, marginTop: 14 }} />
        <span className="sk" style={{ width: "100%", height: 64, marginTop: 24 }} />
      </div>
      <div className="card sk-card" style={{ height: 280 }} />
    </main>
  );
}

function Empty({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <main className="page empty">
      <h1>{title}</h1>
      <p>{body}</p>
      {children}
    </main>
  );
}
