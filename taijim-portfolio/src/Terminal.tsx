import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CFG, P } from "./data";
import { sleep } from "./lib";

type Line = { text: string; cls?: string };

/** Each command returns the lines it prints. */
const COMMANDS: Record<string, () => string[]> = {
  help: () => [
    "commands:",
    "  whoami         who I am",
    "  about          short statement",
    "  focus          what I work on",
    "  skills         technical vocabulary",
    "  projects (ls)  the three systems",
    "  open <name>    open authx | quill | stylebook",
    "  contact        where to find me",
    "  echo <text>    print text",
    "  clear          clear the screen",
    "tip: use ↑ ↓ for history, Tab to complete",
  ],
  whoami: () => ["m. taijim — software engineer (full-stack) · india · 2026"],
  about: () => [
    "I'm a Full-Stack Developer building modern web applications with a focus on backend architecture, distributed systems, application security, and intelligent applications.",
    "I work across the stack to turn ideas into reliable, scalable, and user-focused digital products.",
  ],
  focus: () => [
    "[x] backend architecture",
    "[x] distributed systems",
    "[x] application security",
    "[x] intelligent applications",
  ],
  skills: () => [
    "java · python · javascript · typescript",
    "html · css · mysql · mongodb · linux",
    "react · spring boot · tailwind css · shadcn/ui",
    "docker · git · github · vercel",
    "communication · leadership · problem solving · teamwork",
  ],
  projects: () => [
    ...P.map(
      (p, i) =>
        `0${i + 1} ${p.name.toLowerCase()} — ${p.sub}${p.status ? ` [${p.status.toLowerCase()}]` : ""}`,
    ),
    "try: open authx",
  ],
  contact: () => [
    "github    " + CFG.github,
    "linkedin  " + CFG.linkedin,
    "twitter   " + CFG.twitter,
    "email     " + CFG.email.replace("mailto:", ""),
    "or use the form at the end of the page",
  ],
};
const COMMAND_NAMES = [
  ...Object.keys(COMMANDS),
  "clear",
  "echo",
  "ls",
  "open",
].sort();
const CHIPS = [
  "whoami",
  "focus",
  "skills",
  "projects",
  "contact",
  "help",
  "clear",
];

/** A small interactive terminal. Visitors can type commands or tap the chips. */
export default function Terminal({
  autoPlay,
  onOpenProject,
}: {
  autoPlay: boolean;
  onOpenProject: (i: number) => void;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const touched = useRef(false); // true once the visitor interacts (stops the auto demo)
  const history = useRef<string[]>([]);
  const historyPos = useRef(0);

  const print = (text: string, cls?: string) =>
    setLines((l) => [...l, { text, cls }]);
  useEffect(() => {
    log.current?.scrollTo(0, log.current.scrollHeight);
  }, [lines]);

  async function run(raw: string) {
    const text = raw.trim();
    if (!text) return;
    print("$ " + text, "c");
    const [cmd, ...args] = text.toLowerCase().split(/\s+/);

    if (cmd === "clear") return setLines([]);
    if (cmd === "echo") return print(text.slice(5));
    if (cmd === "open") {
      const query = args.join("");
      const index = query
        ? P.findIndex((p) =>
            p.name.toLowerCase().replace(/\s/g, "").startsWith(query),
          )
        : -1;
      if (index < 0) return print("usage: open authx | quill | stylebook");
      print(`opening ${P[index].name.toLowerCase()} …`);
      return onOpenProject(index);
    }
    const output = COMMANDS[cmd === "ls" ? "projects" : cmd];
    if (!output) return print(`command not found: ${cmd} — type help`);
    for (const line of output()) {
      await sleep(80);
      print(line, line.startsWith("[x]") ? "x" : undefined);
    }
  }

  // Auto demo: type "whoami" and "focus" once, unless the visitor starts typing
  useEffect(() => {
    if (!autoPlay) return;
    (async () => {
      for (const cmd of ["whoami", "focus"]) {
        for (const ch of cmd) {
          if (touched.current) return;
          setInput((v) => v + ch);
          await sleep(70);
        }
        await sleep(250);
        if (touched.current) return;
        setInput("");
        await run(cmd);
        await sleep(350);
      }
    })();
  }, [autoPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    touched.current = true;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      historyPos.current = Math.max(
        0,
        Math.min(h.length, historyPos.current + (e.key === "ArrowUp" ? -1 : 1)),
      );
      setInput(h[historyPos.current] ?? "");
    } else if (e.key === "Tab") {
      const matches = input.trim()
        ? COMMAND_NAMES.filter((n) => n.startsWith(input.trim().toLowerCase()))
        : [];
      if (matches.length) {
        e.preventDefault();
        matches.length === 1
          ? setInput(matches[0] + " ")
          : print(matches.join("  "));
      }
    }
  }

  return (
    <div
      className="term"
      id="term"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button"))
          field.current?.focus();
      }}
    >
      <div className="tbar">
        <i></i>
        <i></i>
        <i></i>
        <span className="mono">taijim@portfolio — ~</span>
      </div>
      <div
        id="tb"
        ref={log}
        data-lenis-prevent
        role="log"
        aria-live="polite"
        tabIndex={0}
      >
        {lines.map((l, i) => (
          <div key={i} className={l.cls}>
            {l.text}
          </div>
        ))}
      </div>
      <form
        id="tf"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          touched.current = true;
          if (input.trim()) {
            history.current.push(input);
            historyPos.current = history.current.length;
          }
          run(input);
          setInput("");
        }}
      >
        <label htmlFor="ti" className="sr">
          Terminal command
        </label>
        <span>$</span>
        <input
          id="ti"
          ref={field}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="type a command — try help"
        />
      </form>
      <div id="chips">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              touched.current = true;
              run(c);
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
