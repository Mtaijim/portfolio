import { useEffect, useRef } from "react";
import anime from "animejs";
import Wordmarkname from "./Wordmarkname";
import { useProgressEffect } from "./hooks";
import { reducedMotion, smoothstep } from "./lib";

/** First screen: the name (cursor-reactive wordmark), tagline, metadata. Fades out as the visitor scrolls. */
export default function Hero({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useProgressEffect(ref, (el, p) => {
    const visible = 1 - smoothstep(0.06, 0.22, p);
    el.style.opacity = String(ready ? visible : 0);
    el.style.transform = `translateY(${-(1 - visible) * 40}px)`;
  });

  // Entrance animation once the loading screen is done
  useEffect(() => {
    if (!ready || reducedMotion) return;
    anime
      .timeline({ easing: "easeOutExpo" })
      .add({
        targets: ".wm",
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 1500,
      })
      .add(
        {
          targets: "#tag span",
          opacity: [0, 1],
          translateY: [14, 0],
          delay: anime.stagger(150),
          duration: 1400,
        },
        300,
      )
      .add(
        {
          targets: "#meta span",
          opacity: [0, 1],
          delay: anime.stagger(120),
          duration: 1600,
        },
        700,
      );
  }, [ready]);

  return (
    <header id="hero" ref={ref} className="fx">
      <h1 id="name" className="sr">
        M. TAIJIM
      </h1>
      <Wordmarkname />
      <p id="tag">
        <span>I BUILD SYSTEMS THAT</span>
        <span>THINK, SCALE, AND SHIP.</span>
      </p>
      <p id="meta" className="mono">
        <span>Software Engineer</span>
        <span>India</span>
        <span>2026</span>
      </p>
    </header>
  );
}
