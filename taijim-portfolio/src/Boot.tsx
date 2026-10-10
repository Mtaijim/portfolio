import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { reducedMotion } from "./lib";
import { lenis } from "./scroll";

const LINES = [
  "booting portfolio.sys",
  "mounting projects … authx · quill reply · stylebook",
  "waking neural system",
  "status: ready",
];
const SHOW_AT = [0, 25, 55, 90]; // percentage at which each line appears
const COUNT_MS = 2600;

/** Terminal-style loading screen: counts to 100%, then fades away and calls onDone. */
export default function Boot({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const finished = useRef(onDone); // keep the latest callback without restarting the animation
  finished.current = onDone;
  const [percent, setPercent] = useState(0);
  const [gone, setGone] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      finished.current();
      return;
    }
    lenis.stop(); // no scrolling while loading
    const counter = { value: 0 };
    const timeline = anime
      .timeline({ easing: "linear" })
      .add({
        targets: counter,
        value: 100,
        duration: COUNT_MS,
        easing: "easeInOutQuad",
        update: () => setPercent(Math.round(counter.value)),
      })
      .add({
        targets: root.current,
        opacity: 0,
        duration: 900,
        delay: 450,
        easing: "easeInOutQuad",
        begin: () => {
          lenis.start();
          finished.current();
        },
      });
    timeline.finished.then(() => setGone(true));

    // Click or key press skips ahead to 100%
    const skip = () => {
      if (timeline.currentTime < COUNT_MS) timeline.seek(COUNT_MS);
    };
    addEventListener("pointerdown", skip);
    addEventListener("keydown", skip);
    return () => {
      removeEventListener("pointerdown", skip);
      removeEventListener("keydown", skip);
      timeline.pause();
    };
  }, []);

  if (gone) return null;
  const filled = Math.round(percent * 0.28);
  return (
    <div id="boot" ref={root} role="status" aria-label="Loading">
      <div id="bl">
        {LINES.map((text, i) => (
          <div key={text} style={{ opacity: percent >= SHOW_AT[i] ? 1 : 0 }}>
            <b>&gt;</b> {text}
          </div>
        ))}
      </div>
      <div id="bp">
        <div id="bn">{percent}%</div>
        <div id="bb">
          [{"█".repeat(filled)}
          {"░".repeat(28 - filled)}]
        </div>
      </div>
    </div>
  );
}
