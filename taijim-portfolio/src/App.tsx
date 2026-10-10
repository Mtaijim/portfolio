import { useRef, useState } from 'react'
import NeuralCanvas from './NeuralCanvas'
import ProjectView from './ProjectView'
import Boot from './Boot'
import Hero from './Hero'
import About from './About'
import Skills from './Skills'
import Contact from './Contact'
import { useProgressEffect, useSceneInfo } from './hooks'
import { scrollToFraction } from './scroll'
import { smoothstep } from './lib'

const NAV: [string, number][] = [['Projects', 0.45], ['About', 0.63], ['Skills', 0.78], ['Contact', 1]]

/** Small "M. TAIJIM — Software Engineer" mark that appears once the big name has faded. */
function Mark() {
  const ref = useRef<HTMLDivElement>(null)
  useProgressEffect(ref, (el, p) => { el.style.opacity = String(smoothstep(0.08, 0.2, p) * (1 - smoothstep(0.86, 0.92, p))) })
  return <div id="mark" ref={ref} className="fx mono"><b>M. TAIJIM</b> — Software Engineer</div>
}

/** Hint shown only while the network is on screen. */
function Hint({ hidden }: { hidden: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useProgressEffect(ref, (el, p) => {
    el.style.opacity = hidden ? '0' : String(smoothstep(0.3, 0.38, p) * (1 - smoothstep(0.52, 0.58, p)))
  })
  return <div id="hint" ref={ref} className="fx mono" aria-hidden="true">Select a node to enter the system</div>
}

export default function App() {
  const [ready, setReady] = useState(false)                    // loading screen finished
  const [openIndex, setOpenIndex] = useState<number | null>(null) // which project is open
  const lastFocus = useRef<HTMLElement | null>(null)
  const { label, nav } = useSceneInfo()

  const openProject = (i: number) => { lastFocus.current = document.activeElement as HTMLElement; setOpenIndex(i) }
  const closed = () => { setOpenIndex(null); lastFocus.current?.focus({ preventScroll: true }) }

  return (
    <>
      <div id="spacer"></div>
      <NeuralCanvas awake={ready} isOpen={openIndex !== null} onOpen={openProject} />
      <Mark />
      <nav id="nav" className="fx mono" aria-label="Sections">
        {NAV.map(([name, at], i) => (
          <button key={name} className={nav === i ? 'on' : ''} onClick={() => openIndex === null && scrollToFraction(at)}>
            <i>0{i + 1}</i>{name}
          </button>
        ))}
      </nav>
      <div id="cap" className="fx mono" aria-hidden="true">{openIndex !== null ? '05 — PROJECT' : label}</div>
      <Hint hidden={openIndex !== null} />
      <Hero ready={ready} />
      <About onOpenProject={openProject} />
      <Skills />
      <Contact />
      <ProjectView index={openIndex} onClosed={closed} />
      <Boot onDone={() => setReady(true)} />
    </>
  )
}
