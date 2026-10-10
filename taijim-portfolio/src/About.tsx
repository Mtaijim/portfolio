import { useMemo, useRef, useState } from "react";
import { useProgressEffect, useSceneFade } from "./hooks";
import { clamp, reducedMotion, smoothstep } from "./lib";
import Terminal from "./Terminal";

const TEXT =
  "I'm a Full-Stack Developer building modern web applications with a focus on backend architecture, distributed systems, application security, and intelligent applications. I work across the stack to turn ideas into reliable, scalable, and user-focused digital products.";

/** Phrases that get a coloured pill (1 = sage, 2 = blue-gray, 3 = sand). */
const HIGHLIGHTS: [string, number][] = [
  ["backend architecture", 1],
  ["distributed systems", 2],
  ["application security", 3],
  ["intelligent applications", 1],
];

/** For each word, which highlight colour applies (0 = none). */
function colourWords(words: string[]) {
  const plain = words.map((w) => w.replace(/\W+$/, "").toLowerCase());
  const colours = words.map(() => 0);
  for (const [phrase, colour] of HIGHLIGHTS) {
    const parts = phrase.split(" ");
    for (let i = 0; i <= words.length - parts.length; i++) {
      if (parts.every((part, k) => plain[i + k] === part))
        parts.forEach((_, k) => (colours[i + k] = colour));
    }
  }
  return colours;
}

/** Words start as grey placeholder pills and turn into text one by one as you scroll. */
function PillText() {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = useMemo(() => TEXT.split(" "), []);
  const colours = useMemo(() => colourWords(words), [words]);
  const lastReveal = useRef(-1);

  useProgressEffect(ref, (el, p) => {
    const reveal = reducedMotion ? 1 : smoothstep(0.6, 0.68, p);
    if (reveal === lastReveal.current) return;
    lastReveal.current = reveal;
    [...el.children].forEach((word, i) => {
      // each word fades in over a window of 4 words behind the "wave front"
      const k = clamp((reveal * (words.length + 4) - i) / 4);
      (word as HTMLElement).style.setProperty("--t", String(k));
      (word as HTMLElement).style.setProperty("--p", String(1 - k));
    });
  });

  return (
    <p id="ab" ref={ref} aria-label={TEXT}>
      {words.map((word, i) => {
        const [, core, punctuation] = word.match(/^(.*?)(\W*)$/)!;
        return (
          <span
            key={i}
            className={`w${colours[i] ? " c" + colours[i] : ""}`}
            aria-hidden="true"
          >
            <i>
              {colours[i] ? (
                <>
                  <b>{core}</b>
                  {punctuation}
                </>
              ) : (
                word
              )}
            </i>
          </span>
        );
      })}
    </p>
  );
}

export default function About({
  onOpenProject,
}: {
  onOpenProject: (i: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  useSceneFade(ref, [0.58, 0.63, 0.68, 0.72], () => setTerminalReady(true));

  return (
    <section id="about" ref={ref} className="fx" aria-label="About">
      <div className="ab-t">
        <div className="mono">About me / 001</div>
        <h2>I engineer the full stack.</h2>
        <PillText />
      </div>
      <Terminal autoPlay={terminalReady} onOpenProject={onOpenProject} />
    </section>
  );
}
