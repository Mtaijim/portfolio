import Lenis from "lenis";
import { reducedMotion } from "./lib";

export const scene = { progress: 0 };
export const perf = { tier: 2 };

// Always start at the top: a restored scroll position would skip the opening scenes.
history.scrollRestoration = "manual";
scrollTo(0, 0);

export const lenis = new Lenis({
  autoRaf: false, // we drive it from our own loop
  lerp: 0.1, // lower = floatier, higher = snappier (0.1 is the classic smooth feel)
  wheelMultiplier: 1, // 1 = one notch travels one notch; larger values skip scenes
  smoothWheel: !reducedMotion,
  // touch devices keep native momentum scrolling (smoothest on phones)
});

let maxScroll = 1;
const measure = () => {
  maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
};
addEventListener("resize", measure);
addEventListener("load", measure);
new ResizeObserver(measure).observe(document.documentElement);
measure();

type FrameListener = (seconds: number) => void;
const listeners = new Set<FrameListener>();
let running = false,
  last = 0,
  slow = 0;

function loop(now: number) {
  requestAnimationFrame(loop);
  const frameMs = last ? now - last : 16;
  last = now;
  if (frameMs < 200) {
    slow = frameMs > 28 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 30 && perf.tier > 0) {
      perf.tier--;
      slow = 0;
    }
  }
  lenis.raf(now);
  scene.progress = Math.min(1, Math.max(0, lenis.scroll / maxScroll)); // already smooth, no extra lerp
  listeners.forEach((fn) => fn(now / 1000));
}

export function onFrame(fn: FrameListener) {
  listeners.add(fn);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
  return () => {
    listeners.delete(fn);
  };
}

export function scrollToFraction(fraction: number) {
  lenis.scrollTo(maxScroll * fraction, { duration: reducedMotion ? 0 : 1.1 });
}
