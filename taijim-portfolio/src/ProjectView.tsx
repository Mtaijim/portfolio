import { useEffect, useRef, useState } from 'react'
import anime from 'animejs'
import { P } from './data'
import { camera } from './camera'
import { ms } from './lib'

/** Architecture diagram: rows of labels joined by curved lines. A "\n" in a label makes two lines. */
function Diagram({ layers }: { layers: string[][] }) {
  const WIDTH = 520, GAP = 84, HEIGHT = GAP * (layers.length - 1) + 80
  const x = (count: number, j: number) => ((j + 1) * WIDTH) / (count + 1)
  const y = (i: number) => 30 + i * GAP
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Architecture diagram">
      {layers.slice(0, -1).flatMap((row, i) => row.flatMap((_, j) => layers[i + 1].map((next, k) => {
        const x1 = x(row.length, j), x2 = x(layers[i + 1].length, k), mid = (y(i) + y(i + 1)) / 2
        const end = y(i + 1) - (next.includes('\n') ? 44 : 30)
        return <path key={`${i}-${j}-${k}`} d={`M${x1} ${y(i) + 4}C${x1} ${mid},${x2} ${mid},${x2} ${end}`} />
      })))}
      {layers.map((row, i) => row.map((label, j) => (
        <g key={`${i}-${j}`} className="tx">
          <circle cx={x(row.length, j)} cy={y(i)} r="2.5" />
          <text x={x(row.length, j)} y={y(i) - 14}>
            {label.split('\n').map((line, k) => <tspan key={k} x={x(row.length, j)} dy={k ? '1.25em' : 0}>{line}</tspan>)}
          </text>
        </g>
      )))}
    </svg>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="sec rv"><h3>{title}</h3>{children}</div>
)

type Props = { index: number | null; onClosed: () => void }

/** Full-screen project page. It grows out of the clicked node and collapses back into it. */
export default function ProjectView({ index, onClosed }: Props) {
  const root = useRef<HTMLElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const busy = useRef(false)
  const [shown, setShown] = useState<number | null>(null) // project currently displayed
  const project = shown === null ? null : P[shown]
  const maxRadius = () => Math.hypot(innerWidth, innerHeight) * 0.6
  const setClip = (el: HTMLElement, r: number) => { el.style.clipPath = `circle(${r}px at 50% 50%)` }

  // 1) the App asks to open a project -> render its content
  useEffect(() => { if (index !== null && shown === null) setShown(index) }, [index, shown])

  // 2) once rendered, play the opening animation
  useEffect(() => {
    if (shown === null) return
    const el = root.current!
    busy.current = true
    camera.index = shown
    document.body.style.overflow = 'hidden'
    el.scrollTop = 0
    el.style.visibility = 'visible'
    el.querySelectorAll<HTMLElement>('.rv,.tx').forEach(n => { n.style.opacity = '0' })
    const radius = { value: 0 }
    anime.timeline({ easing: 'easeInOutExpo' })
      .add({ targets: camera, zoom: 1, duration: ms(1500) })                               // camera flies to the node
      .add({ targets: radius, value: maxRadius(), duration: ms(1400), update: () => setClip(el, radius.value) }, ms(700)) // node expands into the page
      .add({ targets: el.querySelectorAll('.rv'), opacity: [0, 1], translateY: [26, 0], delay: anime.stagger(90), duration: ms(1100), easing: 'easeOutExpo' }, `-=${ms(550)}`)
      .add({ targets: el.querySelectorAll('.dg path'), strokeDashoffset: [anime.setDashoffset, 0], duration: ms(1700), delay: anime.stagger(60), easing: 'easeInOutSine' }, `-=${ms(1000)}`)
      .add({ targets: el.querySelectorAll('.tx'), opacity: [0, 1], duration: ms(900), delay: anime.stagger(70), easing: 'easeOutQuad' }, `-=${ms(1500)}`)
      .finished.then(() => { busy.current = false; backButton.current?.focus() })
  }, [shown])

  // 3) closing: reverse everything, then tell the App
  function close() {
    const el = root.current
    if (shown === null || busy.current || !el) return
    busy.current = true
    const radius = { value: maxRadius() }
    anime.timeline({ easing: 'easeInOutExpo' })
      .add({ targets: el.querySelectorAll('.rv,.tx'), opacity: 0, duration: ms(350), easing: 'easeOutQuad' })
      .add({ targets: radius, value: 0, duration: ms(1000), update: () => setClip(el, radius.value) }, ms(150))
      .add({ targets: camera, zoom: 0, duration: ms(1400) }, ms(500))
      .finished.then(() => {
        el.style.visibility = 'hidden'
        document.body.style.overflow = ''
        busy.current = false
        setShown(null)
        onClosed()
      })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  return (
    <>
      <button id="back" ref={backButton} className="mono" style={{ visibility: project ? 'visible' : 'hidden' }} onClick={close}>
        ← Return to system
      </button>
      <article id="proj" ref={root} role="dialog" aria-modal="true" aria-label={project?.name ?? 'Project'}>
        {project && shown !== null && (
          <>
            <div>
              <p className="mono rv">0{shown + 1} / 03 — Project</p>
              <h2 className="rv">{project.name}</h2>
              <p className="sub rv">{project.sub}</p>
              {project.status && <p className="mono rv st"><i className="dot" />Status — {project.status}</p>}
              <p className="desc rv">{project.desc}</p>
              <Section title={project.k}><p>{project.v}</p></Section>
              <Section title="SYSTEM"><ul>{project.sys.map(s => <li key={s}>{s}</li>)}</ul></Section>
              <Section title="STACK"><ul>{project.stack.map(s => <li key={s}>{s}</li>)}</ul></Section>
              <Section title="LINKS">
                <a href={project.gh} target="_blank" rel="noopener">GitHub ↗</a>
                {project.demo
                  ? <a href={project.demo} target="_blank" rel="noopener">Live Demo ↗</a>
                  : <span className="mono">Live demo — coming soon</span>}
              </Section>
            </div>
            <div className="dg rv"><Diagram layers={project.L} /></div>
          </>
        )}
      </article>
    </>
  )
}
