import { useEffect, useRef } from 'react'
import anime from 'animejs'
import { P } from './data'
import { camera } from './camera'
import { onFrame, scene } from './scroll'
import { clamp, smoothstep, reducedMotion } from './lib'

type Particle = {
  homeX: number; homeY: number   // resting position
  x: number; y: number           // current position
  pullX: number; pullY: number   // smoothed pull towards the cursor
  phase1: number; phase2: number // random offsets so particles drift differently
  drift: number; speed: number   // drift distance (px) and speed
  size: number
  appearAt: number               // network "reveal" level at which this particle appears
  project: number                // index of the project this node opens, or -1 for plain particles
  alpha: number                  // current visibility 0-1
  near: number                   // how close the cursor is 0-1
}
type Pulse = { a: Particle; b: Particle; i: number; j: number; u: number; speed: number }

const makeParticle = (x: number, y: number, project: number): Particle => ({
  homeX: x, homeY: y, x, y, pullX: 0, pullY: 0,
  phase1: Math.random() * 6.28, phase2: Math.random() * 6.28,
  drift: project >= 0 ? 10 : 6 + Math.random() * 14, speed: 0.15 + Math.random() * 0.25,
  size: 0.8 + Math.random() * 1.3, appearAt: project >= 0 ? 0.5 : Math.random() * 0.8,
  project, alpha: 0, near: 0,
})

/** Project nodes sit at fixed spots; the other particles are spread evenly (best-candidate sampling). */
function createParticles(w: number, h: number, mobile: boolean): Particle[] {
  const count = mobile ? 44 : (navigator.hardwareConcurrency || 8) <= 4 ? 70 : 100
  const list = P.map((p, i) => { const [fx, fy] = mobile ? p.mob : p.pos; return makeParticle(fx * w, fy * h, i) })
  while (list.length < count) {
    let best = [0, 0], bestDistance = -1
    for (let tries = 0; tries < 14; tries++) {
      const x = Math.random() * w, y = Math.random() * h
      const nearest = Math.min(...list.map(q => (q.homeX - x) ** 2 + (q.homeY - y) ** 2))
      if (nearest > bestDistance) { bestDistance = nearest; best = [x, y] }
    }
    list.push(makeParticle(best[0], best[1], -1))
  }
  return list
}

type Props = { awake: boolean; isOpen: boolean; onOpen: (i: number) => void }

/** The living neural network. It is also the navigation: the 3 project nodes are real buttons. */
export default function NeuralCanvas({ awake, isOpen, onOpen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const wake = useRef({ value: 0 })          // 0-0.22: the network slowly "wakes up" after loading
  const openRef = useRef(isOpen)
  openRef.current = isOpen

  useEffect(() => {
    if (!awake) return
    if (reducedMotion) { wake.current.value = 0.22; return }
    const animation = anime({ targets: wake.current, value: 0.22, duration: 10000, delay: 2200, easing: 'easeInOutSine' })
    return () => animation.pause()
  }, [awake])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const mouse = { x: -1e4, y: -1e4, active: false }
    const hoverAmount = P.map(() => 0)
    let w = 0, h = 0, dpr = 1, linkDistance = 0, lastTime = 0
    let particles: Particle[] = [], pulses: Pulse[] = []
    // values computed once per frame and shared by the draw helpers
    const view = { scale: 1, tx: 0, ty: 0, fade: 1, reveal: 0, links: 0, dust: 1 }

    function build() {
      w = innerWidth; h = innerHeight
      const mobile = w < 720
      dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2) // cap pixel density for performance
      canvas.width = w * dpr; canvas.height = h * dpr
      particles = createParticles(w, h, mobile)
      pulses = []
      linkDistance = Math.max(Math.min(w, h) * 0.26, Math.sqrt((w * h) / particles.length) * 1.55)
    }

    /** Where a connection curves through: a slow sway, bent towards the cursor. */
    function controlPoint(a: Particle, b: Particle, i: number, j: number, t: number, dist: number) {
      let cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
      const sway = reducedMotion ? 0 : Math.sin(t * 0.3 + i * 1.3 + j * 0.7) * dist * 0.13
      cx += (-(b.y - a.y) / dist) * sway
      cy += ((b.x - a.x) / dist) * sway
      let near = 0
      if (mouse.active && !openRef.current) {
        const d = Math.hypot(mouse.x - cx, mouse.y - cy)
        if (d < 190) { near = 1 - d / 190; cx += (mouse.x - cx) * near * 0.22; cy += (mouse.y - cy) * near * 0.22 }
      }
      return { cx, cy, near }
    }

    function moveParticles(t: number) {
      for (const p of particles) {
        const amount = reducedMotion ? 0 : p.drift
        const wanderX = p.homeX + (Math.sin(t * p.speed + p.phase1) + 0.6 * Math.sin(t * p.speed * 0.57 + p.phase2)) * amount
        const wanderY = p.homeY + (Math.cos(t * p.speed * 0.9 + p.phase2) + 0.6 * Math.cos(t * p.speed * 0.5 + p.phase1)) * amount
        let pullX = 0, pullY = 0
        p.near = 0
        if (mouse.active && !openRef.current) {
          const dx = mouse.x - wanderX, dy = mouse.y - wanderY, d = Math.hypot(dx, dy)
          if (d < 170 && d > 1) { p.near = (1 - d / 170) ** 2; pullX = (dx / d) * p.near * 22; pullY = (dy / d) * p.near * 22 }
        }
        p.pullX += (pullX - p.pullX) * 0.07
        p.pullY += (pullY - p.pullY) * 0.07
        p.x = wanderX + p.pullX
        p.y = wanderY + p.pullY
        p.alpha = clamp((view.reveal - p.appearAt) / 0.12) * view.dust
      }
    }

    function drawLinks(t: number) {
      if (view.links < 0.01) return
      ctx.lineWidth = 1 / view.scale
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        if (a.alpha < 0.02) continue
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          if (b.alpha < 0.02) continue
          const reach = linkDistance * (a.project >= 0 || b.project >= 0 ? 1.5 : 1) // project nodes connect further
          const dx = b.x - a.x, dy = b.y - a.y
          if (dx * dx + dy * dy > reach * reach) continue
          const dist = Math.hypot(dx, dy)
          const { cx, cy, near } = controlPoint(a, b, i, j, t, dist)
          const alpha = ((1 - dist / reach) * 0.3 + near * 0.28) * view.links * a.alpha * b.alpha * view.fade
          if (alpha < 0.01) continue
          ctx.strokeStyle = `rgba(236,232,225,${alpha.toFixed(3)})`
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y); ctx.stroke()
        }
      }
    }

    function pickLinkedPair() {
      for (let tries = 0; tries < 30; tries++) {
        const i = (Math.random() * particles.length) | 0, j = (Math.random() * particles.length) | 0
        const a = particles[i], b = particles[j]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (i !== j && d > 1 && d < linkDistance && a.alpha > 0.9 && b.alpha > 0.9) return { a, b, i, j }
      }
      return null
    }

    /** Small dots of light travelling along connections. */
    function drawPulses(t: number, dt: number) {
      if (reducedMotion || view.links < 0.4) return
      while (pulses.length < (particles.length > 60 ? 6 : 3)) {
        const pair = pickLinkedPair()
        if (!pair) break
        pulses.push({ ...pair, u: 0, speed: 0.25 + Math.random() * 0.3 })
      }
      pulses = pulses.filter(p => {
        const dist = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) || 1
        p.u += dt * p.speed
        if (p.u >= 1 || dist > linkDistance * 1.2) return false
        const { cx, cy } = controlPoint(p.a, p.b, p.i, p.j, t, dist)
        const u = p.u, v = 1 - u // point on the quadratic curve
        const x = v * v * p.a.x + 2 * v * u * cx + u * u * p.b.x
        const y = v * v * p.a.y + 2 * v * u * cy + u * u * p.b.y
        ctx.fillStyle = `rgba(236,232,225,${(0.75 * Math.sin(u * Math.PI) * view.links * view.fade).toFixed(3)})`
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill()
        return true
      })
    }

    function drawParticles(t: number, nodeFade: number, zoom: number) {
      for (const p of particles) {
        if (p.project < 0) {
          if (p.alpha < 0.02) continue
          ctx.fillStyle = `rgba(236,232,225,${((0.28 + p.near * 0.5) * p.alpha * view.fade).toFixed(3)})`
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.near * 0.6), 0, 6.283); ctx.fill()
          continue
        }
        // ---- project node ----
        const i = p.project, color = P[i].ac
        const focused = camera.index === i && zoom > 0
        const alpha = p.alpha * nodeFade * (focused ? 1 : 1 - zoom * 0.8)
        hoverAmount[i] += ((camera.hover === i ? 1 : 0) - hoverAmount[i]) * 0.1
        const hover = hoverAmount[i], breathe = Math.sin(t * 1.2 + i * 2) * 1.5

        if (p.alpha > 0.02) { // before the nodes "wake", show only a faint seed dot
          ctx.fillStyle = `rgba(236,232,225,${(0.4 * p.alpha * (1 - nodeFade) * view.fade).toFixed(3)})`
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 6.283); ctx.fill()
        }
        if (alpha > 0.01) {
          const ring = (radius: number, a: number) => {
            ctx.strokeStyle = `rgba(${color},${a.toFixed(3)})`
            ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, 6.283); ctx.stroke()
          }
          ring(9 + hover * 8 + breathe, 0.55 * alpha)
          ring(19 + hover * 10 - breathe, 0.18 * alpha)
          if (focused) ring(20 + zoom * 150, 0.3 * (1 - zoom * 0.5)) // the node "expands" while zooming in
          ctx.fillStyle = `rgba(236,232,225,${alpha.toFixed(3)})`
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 + hover * 1.5, 0, 6.283); ctx.fill()
        }
        // keep the real <button> on top of the drawn node
        const button = buttons.current[i]
        if (button) {
          const clickable = alpha > 0.55 && !openRef.current
          button.style.transform = `translate(${(p.x * view.scale + view.tx).toFixed(1)}px,${(p.y * view.scale + view.ty).toFixed(1)}px)`
          button.style.opacity = Math.min(1, alpha * 1.2).toFixed(2)
          button.style.pointerEvents = clickable ? 'auto' : 'none'
          button.tabIndex = clickable ? 0 : -1
        }
      }
    }

    function frame(t: number) {
      const dt = Math.min(0.05, t - lastTime); lastTime = t
      const p = scene.progress
      // How much of the network is visible, derived from scroll position
      view.reveal = Math.max(wake.current.value, smoothstep(0.08, 0.4, p))
      view.links = smoothstep(0.12, 0.5, view.reveal) * (1 - smoothstep(0.82, 0.9, p)) // connections vanish first…
      view.dust = 1 - smoothstep(0.86, 0.96, p)                                         // …then the particles
      const nodeFade = smoothstep(0.2, 0.32, p) * (1 - smoothstep(0.58, 0.66, p))
      const zoom = camera.zoom
      view.scale = 1 + 1.9 * zoom
      view.fade = (1 - 0.6 * zoom) * (1 - 0.62 * smoothstep(0.58, 0.66, p))

      moveParticles(t)
      const focus = particles[camera.index]
      view.tx = zoom * (w / 2 - focus.x * view.scale)  // camera glides so the chosen node reaches screen centre
      view.ty = zoom * (h / 2 - focus.y * view.scale)
      ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.tx, dpr * view.ty)
      ctx.clearRect(-view.tx / view.scale, -view.ty / view.scale, w / view.scale, h / view.scale)
      drawLinks(t)
      drawPulses(t, dt)
      drawParticles(t, nodeFade, zoom)
    }

    // ---- setup / teardown ----
    build()
    let resizeTimer: number, lastWidth = innerWidth
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (innerWidth !== lastWidth || Math.abs(innerHeight - h) > h * 0.25) { lastWidth = innerWidth; build() }
      }, 200)
    }
    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true }
    const onUp = (e: PointerEvent) => { if (e.pointerType !== 'mouse') mouse.active = false }
    const onLeave = () => { mouse.active = false }
    addEventListener('resize', onResize)
    addEventListener('pointermove', onMove)
    addEventListener('pointerup', onUp)
    document.addEventListener('pointerleave', onLeave)
    const stop = onFrame(frame)
    return () => {
      stop()
      removeEventListener('resize', onResize); removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp); document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" />
      {P.map((project, i) => (
        <button key={project.name} ref={el => { buttons.current[i] = el }} className="node" tabIndex={-1}
          aria-label={`${project.name} — ${project.sub}. Open project`} onClick={() => onOpen(i)}
          onMouseEnter={() => { camera.hover = i }} onMouseLeave={() => { camera.hover = -1 }}
          onFocus={() => { camera.hover = i }} onBlur={() => { camera.hover = -1 }}>
          <span className="lb">{project.name}<small>{project.sub}{project.status ? ` · ${project.status.toLowerCase()}` : ''}</small></span>
        </button>
      ))}
    </>
  )
}
