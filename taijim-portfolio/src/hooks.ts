import { useEffect, useRef, useState, type RefObject } from "react";
import { onFrame, scene } from "./scroll";
import { smoothstep } from "./lib";

/** Run `fn(element, progress)` every frame. Writes styles directly, so React never re-renders. */
export function useProgressEffect<T extends HTMLElement>(
  ref: RefObject<T>,
  fn: (el: T, p: number) => void,
) {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(
    () =>
      onFrame(() => {
        if (ref.current) latest.current(ref.current, scene.progress);
      }),
    [ref],
  );
}

/**
 * Fade a centred scene in at [inA, inB] and (optionally) out at [outA, outB].
 * While hidden the scene ignores clicks and keyboard focus.
 */
export function useSceneFade(
  ref: RefObject<HTMLElement>,
  [inA, inB, outA, outB]: [number, number, number?, number?],
  onShow?: () => void,
) {
  const shown = useRef(false);
  const was = useRef<boolean | null>(null);
  useProgressEffect(ref, (el, p) => {
    const appear = smoothstep(inA, inB, p);
    const leave =
      outA === undefined || outB === undefined ? 0 : smoothstep(outA, outB, p);
    const visible = appear * (1 - leave);
    const on = visible > 0.6;
    // Fully hidden: switch the scene off completely so no faint ghost of it can blend into the next one
    const hidden = visible < 0.002;
    if (hidden && was.current === false && el.style.visibility === "hidden")
      return;
    el.style.visibility = hidden ? "hidden" : "visible";
    el.style.opacity = visible.toFixed(3);
    el.style.transform = `translateY(calc(-50% + ${((1 - appear) * 30 - leave * 30).toFixed(1)}px))`;
    if (on !== was.current) {
      was.current = on;
      el.style.pointerEvents = on ? "auto" : "none";
      (el as HTMLElement & { inert: boolean }).inert = !on;
    }
    if (on && !shown.current) {
      shown.current = true;
      onShow?.();
    }
  });
}

const SCENES: [number, string][] = [
  [0.1, "01 — IDENTITY"],
  [0.28, "02 — EMERGENCE"],
  [0.42, "03 — NETWORK"],
  [0.58, "04 — DISCOVERY"],
  [0.73, "ABOUT"],
  [0.88, "SKILLS"],
  [0.92, "06 — DISSOLUTION"],
  [2, "07 — CONTACT"],
];

/** Current scene caption and which nav item (0-3) is active (-1 = none). */
export function useSceneInfo() {
  const [info, setInfo] = useState({ label: SCENES[0][1], nav: -1 });
  const last = useRef("");
  useEffect(
    () =>
      onFrame(() => {
        const p = scene.progress;
        const label = SCENES.find(([end]) => p < end)![1];
        const nav =
          p > 0.92
            ? 3
            : p >= 0.73 && p < 0.88
              ? 2
              : p >= 0.58 && p < 0.73
                ? 1
                : p > 0.2 && p < 0.58
                  ? 0
                  : -1;
        const key = label + nav;
        if (key !== last.current) {
          last.current = key;
          setInfo({ label, nav });
        }
      }),
    [],
  );
  return info;
}
