import { useEffect, useRef } from "react";
import { onFrame, scene } from "./scroll";
import { reducedMotion, smoothstep } from "./lib";

/* Look & feel: tweak these */
const C = {
  textColor: "#ece8e1", // colour at the top of the letters
  shade: "#6f6c67", // colour at the bottom of the letters
  accent: "236,232,225", // handles + dashed lines (r,g,b)
  reach: 290, // px radius of the dotted-outline disc around the cursor
  damping: 60, // how tightly the disc follows the cursor (low = glides behind)
  speed: 50, // handle drift + idle sweep speed (0 freezes everything)
  cell: 109, // lattice spacing the three handles snap to (px)
  handle: 9, // handle square size (px)
  labels: true, // coordinate readouts next to the handles
};

/** The ASCII block-letter name (ANSI Shadow style). Drawn as shapes, so it stays crisp and aligned. */
const ART = [
  "███╗   ███╗     ████████╗ █████╗ ██╗     ██╗██╗███╗   ███╗",
  "████╗ ████║     ╚══██╔══╝██╔══██╗██║     ██║██║████╗ ████║",
  "██╔████╔██║        ██║   ███████║██║     ██║██║██╔████╔██║",
  "██║╚██╔╝██║        ██║   ██╔══██║██║██   ██║██║██║╚██╔╝██║",
  "██║ ╚═╝ ██║██╗     ██║   ██║  ██║██║╚█████╔╝██║██║ ╚═╝ ██║",
  "╚═╝     ╚═╝╚═╝     ╚═╝   ╚═╝  ╚═╝╚═╝ ╚════╝ ╚═╝╚═╝     ╚═╝",
];
const ROWS = ART.length;
const COLS = Math.max(...ART.map((r) => r.length));
const isBlock = (r: number, c: number) => ART[r]?.[c] === "█";

type Point = [number, number];
type Handle = { x: number; y: number };

/** The hero name. Solid letters turn into a dotted outline inside a soft disc around the cursor. */
export default function WordmarkName() {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    const fillLayer = document.createElement("canvas"); // solid letters (baked once)
    const lineLayer = document.createElement("canvas"); // dotted outline of the same letters (baked once)
    const disc = document.createElement("canvas"); // scratch canvas for the cursor disc

    // geometry (all in canvas CSS pixels; the canvas is the name plus padding for the disc and handles)
    let dpr = 1, cw = 0, ch = 0, w = 0, h = 0, ox = 0, oy = 0, artW = 0, artH = 0, R = 0;
    const P = { x: 0, y: 0, tx: 0, ty: 0, moved: false, inside: false };
    let active = 0; // 0 = normal cursor, 1 = effect fully on (only while over the name)
    let last = 0;
    const handles: Handle[] = [0, 1, 2].map(() => ({ x: 0, y: 0 }));

    /** Box-drawing characters as double lines, in cell coordinates (so they always join up). */
    function boxLines(chr: string): Point[][] {
      const cx = w / 2, cy = h / 2, d = w * 0.14;
      switch (chr) {
        case "║": return [[[cx - d, 0], [cx - d, h]], [[cx + d, 0], [cx + d, h]]];
        case "═": return [[[0, cy - d], [w, cy - d]], [[0, cy + d], [w, cy + d]]];
        case "╗": return [[[0, cy - d], [cx + d, cy - d], [cx + d, h]], [[0, cy + d], [cx - d, cy + d], [cx - d, h]]];
        case "╔": return [[[w, cy - d], [cx - d, cy - d], [cx - d, h]], [[w, cy + d], [cx + d, cy + d], [cx + d, h]]];
        case "╝": return [[[0, cy + d], [cx + d, cy + d], [cx + d, 0]], [[0, cy - d], [cx - d, cy - d], [cx - d, 0]]];
        case "╚": return [[[w, cy + d], [cx - d, cy + d], [cx - d, 0]], [[w, cy - d], [cx + d, cy - d], [cx + d, 0]]];
      }
      return [];
    }

    /** Soft falloff: opaque at the centre, transparent at the edge. */
    function falloff(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      for (let i = 0; i <= 10; i++) {
        grad.addColorStop(i / 10, `rgba(0,0,0,${Math.pow(1 - smoothstep(0, 1, i / 10), 1.6).toFixed(3)})`);
      }
      return grad;
    }

    /** Draw the name once, either as solid letters or as a dotted outline. */
    function bake(layer: HTMLCanvasElement, outline: boolean) {
      const g = layer.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cw, ch);
      const grad = g.createLinearGradient(0, oy, 0, oy + artH);
      grad.addColorStop(0, C.textColor);
      grad.addColorStop(1, C.shade);
      g.fillStyle = grad;
      g.strokeStyle = grad;
      g.lineJoin = "miter";
      g.lineWidth = outline ? 1.7 : w * 0.12;
      if (outline) { g.lineCap = "round"; g.setLineDash([0.1, 5.5]); } // zero-length dashes + round caps = dots

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const chr = ART[r][c], x0 = ox + c * w, y0 = oy + r * h;
          if (chr === "█") {
            if (!outline) { g.fillRect(x0 - 0.4, y0 - 0.4, w + 0.8, h + 0.8); continue; }
            g.beginPath(); // only the outer edges of connected blocks
            if (!isBlock(r - 1, c)) { g.moveTo(x0, y0); g.lineTo(x0 + w, y0); }
            if (!isBlock(r + 1, c)) { g.moveTo(x0, y0 + h); g.lineTo(x0 + w, y0 + h); }
            if (!isBlock(r, c - 1)) { g.moveTo(x0, y0); g.lineTo(x0, y0 + h); }
            if (!isBlock(r, c + 1)) { g.moveTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); }
            g.stroke();
          } else if (chr !== " ") {
            g.beginPath();
            for (const line of boxLines(chr)) {
              g.moveTo(x0 + line[0][0], y0 + line[0][1]);
              for (let i = 1; i < line.length; i++) g.lineTo(x0 + line[i][0], y0 + line[i][1]);
            }
            g.stroke();
          }
        }
      }
      // the letters melt into the page across their lower third
      g.setLineDash([]);
      g.globalCompositeOperation = "destination-out";
      const fade = g.createLinearGradient(0, oy + artH * 0.62, 0, oy + artH + 2);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,.92)");
      g.fillStyle = fade;
      g.fillRect(0, oy + artH * 0.6, cw, artH * 0.45);
      g.globalCompositeOperation = "source-over";
    }

    /** Fit the name to its container and (re)bake. */
    function layout() {
      const boxEl = box.current!;
      dpr = Math.min(devicePixelRatio || 1, 1.75);
      w = Math.min(boxEl.clientWidth / COLS, (innerHeight * 0.4) / ROWS / 1.67); // same proportions as monospace text
      h = w * 1.67;
      artW = COLS * w;
      artH = ROWS * h;
      R = Math.min(C.reach, innerWidth * 0.42);
      const pad = Math.ceil(R + 12); // room around the name for the disc and the handles
      ox = oy = pad;
      cw = Math.ceil(artW + pad * 2);
      ch = Math.ceil(artH + pad * 2);
      boxEl.style.height = `${artH}px`;
      Object.assign(cv.style, { left: `${-pad}px`, top: `${-pad}px`, width: `${cw}px`, height: `${ch}px` });
      for (const c of [cv, fillLayer, lineLayer]) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
      disc.width = disc.height = Math.ceil(2 * R * dpr);
      bake(fillLayer, false);
      bake(lineLayer, true);
      if (!P.moved) { P.tx = P.x = ox + artW / 2; P.ty = P.y = oy + artH * 0.5; }
      handles.forEach((hd) => { hd.x = P.x; hd.y = P.y; });
    }

    /** Three handles snap to the 2nd–4th nearest cells of a lattice around the cursor. */
    function drawRig(t: number, sp: number) {
      const cell = C.cell, cx = Math.floor(P.x / cell), cy = Math.floor(P.y / cell);
      const cands: { x: number; y: number; d: number }[] = [];
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const x = (cx + dx + 0.5) * cell, y = (cy + dy + 0.5) * cell;
          cands.push({ x, y, d: Math.hypot(x - P.x, y - P.y) });
        }
      }
      cands.sort((a, b) => a.d - b.d);
      cands.slice(1, 4).forEach((c, i) => {
        const hd = handles[i], drift = reducedMotion ? 0 : cell * 0.28;
        hd.x += (c.x + Math.sin(t * 0.7 * sp + i * 2.1) * drift - hd.x) * 0.12;
        hd.y += (c.y + Math.cos(t * 0.6 * sp + i * 1.7) * drift - hd.y) * 0.12;
      });
      const a = C.accent, s = C.handle;
      ctx.setLineDash([3, 5]); // dashed frame around the cursor
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${a},.4)`;
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      handles.forEach((hd) => ctx.lineTo(hd.x, hd.y));
      ctx.lineTo(P.x, P.y);
      ctx.stroke();
      ctx.setLineDash([]); // cursor crosshair
      ctx.strokeStyle = `rgba(${a},.9)`;
      ctx.beginPath();
      ctx.moveTo(P.x - 6, P.y); ctx.lineTo(P.x + 6, P.y);
      ctx.moveTo(P.x, P.y - 6); ctx.lineTo(P.x, P.y + 6);
      ctx.stroke();
      ctx.font = "10px ui-monospace,Menlo,Consolas,monospace";
      handles.forEach((hd) => {
        ctx.fillStyle = "#0a0a0b";
        ctx.fillRect(hd.x - s / 2, hd.y - s / 2, s, s);
        ctx.strokeStyle = `rgba(${a},.9)`;
        ctx.strokeRect(hd.x - s / 2, hd.y - s / 2, s, s);
        if (C.labels) {
          ctx.fillStyle = `rgba(${a},.55)`;
          ctx.fillText(`${Math.round(hd.x)} · ${Math.round(hd.y)}`, hd.x + s, hd.y - s);
        }
      });
    }

    const setCursor = (on: boolean) => { document.documentElement.style.cursor = on ? "crosshair" : ""; };

    function frame(seconds: number) {
      const dt = Math.min(0.05, seconds - last);
      last = seconds;
      if (scene.progress > 0.24) { // the hero has faded away: switch the effect off completely
        if (P.inside) { P.inside = false; setCursor(false); }
        return;
      }
      const sp = C.speed / 50;
      // until a real pointer arrives, a fake one sweeps across the name so the page feels alive
      if (!P.moved && !reducedMotion && sp > 0) {
        P.tx = ox + artW * (0.5 + 0.5 * Math.sin(seconds * 0.5 * sp - 1.2));
        P.ty = oy + artH * 0.5 + Math.sin(seconds * 0.9 * sp) * artH * 0.18;
      }
      const k = 1 - Math.exp((-dt * C.damping) / 10);
      P.x += (P.tx - P.x) * k;
      P.y += (P.ty - P.y) * k;
      active += (((P.inside || !P.moved) ? 1 : 0) - active) * (1 - Math.exp(-dt * 8)); // fade the effect in/out

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(fillLayer, 0, 0, cw, ch);
      if (active < 0.01) return; // cursor is away from the name: plain letters only
      ctx.globalAlpha = active;
      ctx.globalCompositeOperation = "destination-out"; // 1) solid letters fade out inside the disc
      ctx.fillStyle = falloff(ctx, P.x, P.y, R);
      ctx.fillRect(P.x - R, P.y - R, 2 * R, 2 * R);
      ctx.globalCompositeOperation = "source-over";
      const g = disc.getContext("2d")!; // 2) the dotted outline fades in, in the same disc
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, disc.width, disc.height);
      g.drawImage(lineLayer, (P.x - R) * dpr, (P.y - R) * dpr, 2 * R * dpr, 2 * R * dpr, 0, 0, disc.width, disc.height);
      g.globalCompositeOperation = "destination-in";
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = falloff(g, R, R, R);
      g.fillRect(0, 0, 2 * R, 2 * R);
      g.globalCompositeOperation = "source-over";
      ctx.drawImage(disc, P.x - R, P.y - R, 2 * R, 2 * R);
      drawRig(seconds, sp);
      ctx.globalAlpha = 1;
    }

    /** The effect only follows the pointer while it is over the name; elsewhere you get the normal cursor. */
    function onMove(e: PointerEvent) {
      P.moved = true;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, m = h * 0.35;
      const inside = scene.progress < 0.2 && x >= ox - m && x <= ox + artW + m && y >= oy - m && y <= oy + artH + m;
      if (inside) { P.tx = x; P.ty = y; }
      if (inside !== P.inside) { P.inside = inside; setCursor(inside); }
    }
    const onLeave = () => { P.inside = false; setCursor(false); };
    let timer = 0;
    const onResize = () => { clearTimeout(timer); timer = window.setTimeout(layout, 150); };

    layout();
    addEventListener("pointermove", onMove);
    addEventListener("resize", onResize);
    document.addEventListener("pointerleave", onLeave);
    const stop = onFrame(frame);
    return () => {
      stop();
      clearTimeout(timer);
      setCursor(false);
      removeEventListener("pointermove", onMove);
      removeEventListener("resize", onResize);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={box} className="wm" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}