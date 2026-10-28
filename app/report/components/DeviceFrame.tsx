"use client";

import { useEffect, useState } from "react";

// On a wide screen the report opens inside an iPhone 17 Pro–sized frame (402 × 874
// points, Dynamic Island, status bar), so a reviewer on a laptop sees it at real
// phone size. On a phone, or inside the frame itself, it renders normally.
// Add ?frame=0 to the URL to turn the frame off on desktop.
const W = 402, H = 874, STATUS = 54;

export function useFramed() {
  const [mode, setMode] = useState<"unknown" | "frame" | "inside" | "plain">("unknown");
  useEffect(() => {
    const inside = window.self !== window.top;
    if (inside) document.documentElement.classList.add("in-frame");
    const off = new URLSearchParams(window.location.search).get("frame") === "0";
    setMode(inside ? "inside" : !off && window.innerWidth >= 720 ? "frame" : "plain");
  }, []);
  return mode;
}

export function DeviceFrame() {
  const [src, setSrc] = useState("");
  const [scale, setScale] = useState(1);
  useEffect(() => {
    setSrc(window.location.pathname + window.location.search + window.location.hash);
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / (H + 24)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const time = "9:41";

  return (
    <div className="device-stage">
      <div className="device" style={{ transform: `scale(${scale})` }}>
        <span className="device-btn left a" />
        <span className="device-btn left b" />
        <span className="device-btn left c" />
        <span className="device-btn right" />
        <div className="device-screen" style={{ width: W, height: H }}>
          <div className="device-status" style={{ height: STATUS }}>
            <span className="device-time">{time}</span>
            <span className="device-island" />
            <span className="device-icons" aria-hidden="true">
              <svg width="18" height="12" viewBox="0 0 18 12">
                <rect x="0" y="8" width="3" height="4" rx="1" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                <rect x="10" y="3" width="3" height="9" rx="1" />
                <rect x="15" y="0" width="3" height="12" rx="1" />
              </svg>
              <svg width="16" height="12" viewBox="0 0 16 12">
                <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .5 10.2 10.2 0 0 0 .9 3.4L2 4.6a8.5 8.5 0 0 1 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.1-1.2A6.8 6.8 0 0 0 8 3.9a6.8 6.8 0 0 0-4.7 1.9l1.1 1.2A5.1 5.1 0 0 1 8 5.6Zm0 3.4c.6 0 1.1.2 1.5.6L8 11.5 6.5 9.6c.4-.4.9-.6 1.5-.6Z" />
              </svg>
              <svg width="27" height="13" viewBox="0 0 27 13">
                <rect x=".5" y=".5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4" />
                <rect x="2" y="2" width="19" height="9" rx="2" />
                <path d="M24.5 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".4" />
              </svg>
            </span>
          </div>
          {src && <iframe className="device-view" src={src} title="Skin report on a phone" style={{ height: H - STATUS }} />}
          <span className="device-home" />
        </div>
      </div>
    </div>
  );
}
