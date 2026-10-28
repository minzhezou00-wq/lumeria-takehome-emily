"use client";

// Second-level screens live in the URL hash (#scan/noor_scan_23, #area/Chin),
// so the browser's back button, the in-app back button and refresh all work,
// and the report underneath keeps its scroll position.
//
// Where the browser supports View Transitions, in-app navigation runs inside
// one: elements that exist on both screens (the trend chart, the score) glide
// from their old position to their new one instead of being swapped.
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

const read = () => decodeURIComponent(window.location.hash.slice(1));
let depth = 0; // screens we pushed ourselves, so "back" never leaves the report
// Sheets slide up over the report with their own motion; only pages morph.
const isSheet = (r: string) => r === "score" || r === "share";

type Doc = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void>; skipTransition: () => void } };

export function useRoute() {
  const [route, setRoute] = useState("");

  useEffect(() => {
    setRoute(read());
    const on = () => {
      const r = read();
      if (!r) depth = 0;
      setRoute(r);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Runs a URL change, wrapped in a view transition when available.
  const transition = useCallback((change: () => void, dir: "forward" | "back") => {
    const doc = document as Doc;
    if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
    if (isSheet(read())) return change();
    const root = document.documentElement;
    root.dataset.vt = dir;
    // The URL change must happen exactly once, whether or not the transition runs.
    let ran = false;
    const run = () => {
      if (ran) return;
      ran = true;
      change();
    };
    const vt = doc.startViewTransition(
      () =>
        new Promise<void>((done) => {
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            window.removeEventListener("hashchange", settle);
            flushSync(() => setRoute(read()));
            done();
          };
          window.addEventListener("hashchange", settle);
          run();
          setTimeout(settle, 400); // safety net if no hashchange arrives
        }),
    );
    vt.ready.catch(() => {}); // rejects when skipped; that's expected
    vt.updateCallbackDone.catch(() => {});
    vt.finished.catch(() => {}).finally(() => delete root.dataset.vt);
    // A page that isn't painting never starts the transition: navigate anyway.
    setTimeout(() => {
      if (ran) return;
      vt.skipTransition();
      delete root.dataset.vt;
      run();
    }, 300);
  }, []);

  const go = useCallback(
    (to: string) => {
      depth++;
      const change = () => {
        window.location.hash = encodeURIComponent(to).replace(/%2F/g, "/");
      };
      if (isSheet(to)) change();
      else transition(change, "forward");
    },
    [transition],
  );

  const back = useCallback(() => {
    transition(() => {
      if (depth > 0) {
        depth--;
        window.history.back();
      } else {
        // Opened straight from a link: go up to the report.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    }, "back");
  }, [transition]);

  return { route, go, back };
}

export type Go = (to: string) => void;
