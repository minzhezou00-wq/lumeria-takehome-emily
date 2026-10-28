"use client";

// Lumi is Momo by mortspace (MIT, see ./lumi/LICENSE), in its detective outfit.
// The renderer under ./lumi/engine is the author's, unchanged. This loop is a
// trimmed copy of the app's own idle loop: breathing, blinking, looking around,
// following the pointer, and a squash when tapped.
import { useEffect, useRef } from "react";
import { createRenderer, PALETTES, OUTFITS, FACE, hexToRgb } from "./lumi/engine/mesh";
import { LOOK_PALETTE } from "./lumi/looks";

const LOOK = "investigate";
const COLORS = PALETTES[LOOK_PALETTE[LOOK]].map(hexToRgb);

const spring = (x: number, v: number, target: number, k: number, c: number, dt: number) => {
  const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
  for (let i = 0; i < n; i++) {
    v += ((target - x) * k - v * c) * h;
    x += v * h;
  }
  return [x, v];
};
const noise = (t: number) => Math.sin(t) * 0.5 + Math.sin(t * 2.31 + 1.3) * 0.3 + Math.sin(t * 4.07 + 2.1) * 0.2;

export function Lumi({ size = 48 }: { size?: number }) {
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `width:${size}px;height:${size}px;display:block`;
    let R: ReturnType<typeof createRenderer>;
    try {
      R = createRenderer({ canvas, base: "/lumi" });
    } catch {
      return; // no WebGL: the still image stays
    }
    el.appendChild(canvas);
    R.preload();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = { squash: 0, squashV: 0, yaw: 0, yawV: 0, roll: 0, rollV: 0, blink: 0, blinkT: -1, nextBlink: 1.5, eye: [0, 0], eyeV: [0, 0], eyeTarget: [0, 0], nextLook: 1, pointer: null as null | number[] };
    const blinkNow = () => { if (m.blinkT < 0) m.blinkT = 0; };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / 300, dy = (e.clientY - (r.top + r.height / 2)) / 300;
      m.pointer = [Math.max(-1, Math.min(1, dx)) * 0.09, Math.max(-1, Math.min(1, -dy)) * 0.05];
    };
    const onDown = () => { m.squashV -= 2.2; blinkNow(); };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);

    let raf = 0, last = performance.now(), time = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      if (m.pointer) m.eyeTarget = m.pointer;
      else if (!reduce && (m.nextLook -= dt) < 0) {
        m.eyeTarget = [(Math.random() - 0.5) * 0.08, (Math.random() - 0.35) * 0.04];
        m.nextLook = 0.8 + Math.random() * 2.6;
      }
      for (let i = 0; i < 2; i++) [m.eye[i], m.eyeV[i]] = spring(m.eye[i], m.eyeV[i], m.eyeTarget[i], 700, 46, dt);
      if (!reduce && (m.nextBlink -= dt) < 0) { blinkNow(); m.nextBlink = 2.4 + Math.random() * 3.6; }
      if (m.blinkT >= 0) {
        const b = (m.blinkT += dt);
        m.blink = b < 0.07 ? (b / 0.07) ** 2 : b < 0.1 ? 1 : b < 0.24 ? 1 - ((b - 0.1) / 0.14) ** 0.7 : 0;
        if (b >= 0.24) m.blinkT = -1;
      }
      [m.squash, m.squashV] = spring(m.squash, m.squashV, 0, 170, 11, dt);
      [m.yaw, m.yawV] = spring(m.yaw, m.yawV, reduce ? 0 : noise(time * 0.35) * 0.05 + m.eye[0] * 0.9, 60, 14, dt);
      [m.roll, m.rollV] = spring(m.roll, m.rollV, reduce ? 0 : noise(time * 0.27 + 3) * 0.018, 60, 12, dt);
      const breathe = reduce ? 0 : Math.sin((time * 2 * Math.PI) / 3.8) * 0.16;
      const drawn = R.draw(null, Math.round(size * Math.min(2, devicePixelRatio || 1)), {
        outfit: OUTFITS[LOOK], face: FACE[LOOK], smile: 0, sleepy: 0, wink: 0,
        tip: [0, 0, 1], fall: 0, glow: 0, glassY: 0, leaf: 0.5, colors: COLORS,
        yaw: m.yaw, roll: m.roll, squash: m.squash + breathe, bug: 1,
        legL: [0, 0, 0], legR: [0, 0, 0], ant: [1, 0, 0], dead: 0, blink: m.blink,
        look: m.eye, lift: 0, lids: [0, 0], peek: false, brows: [0, 0, 0, 0],
        eyeScale: [1, 1], hatTilt: 0, browOn: 0, restMouth: true, darkFloor: 0, small: 0, fuzz: 1, time,
      });
      // Swap the still image for the live one only once the mesh has really drawn.
      el.classList.toggle("live", !!drawn && !R.info.lost);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      R.gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      el.classList.remove("live");
    };
  }, [size]);

  return <span ref={host} className="lumi-avatar" style={{ width: size, height: size }} aria-hidden="true" />;
}
