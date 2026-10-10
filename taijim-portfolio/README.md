# M. Taijim — Portfolio

Vite + React + TypeScript. Strict types, no `@ts-nocheck`.

## Where to edit
- `src/data.ts` — your links (`CFG`) and the three projects (`P`). **Start here.**
- `src/styles.css` — all styling.

## How the code is organised (one idea per file)
| File | What it does |
| --- | --- |
| `App.tsx` | Puts the page together; knows which project is open |
| `Boot.tsx` | Loading screen (0% → 100%) |
| `Hero.tsx` | ASCII name + tagline |
| `NeuralCanvas.tsx` | The animated network and the 3 project-node buttons |
| `ProjectView.tsx` | Full-screen project page + architecture diagram |
| `About.tsx` / `Terminal.tsx` | About text with pill reveal; the interactive terminal |
| `Skills.tsx` / `Contact.tsx` | Icon skills; contact links and form |
| `scroll.ts` / `hooks.ts` | One shared animation loop; scroll progress; scene fading |
| `lib.ts` / `camera.ts` / `ascii.tsx` / `icons.ts` | Small helpers, shared camera state, ASCII letters, icon data |

Scroll position (0 → 1) drives the story. Scenes fade in and out using `smoothstep(start, end, progress)`.

## Run
    npm install
    npm run dev       # http://localhost:5173
    npm run build     # outputs dist/

## Deploy (Vercel)
Push to GitHub → vercel.com → Add New → Project → import the repo → Deploy.
