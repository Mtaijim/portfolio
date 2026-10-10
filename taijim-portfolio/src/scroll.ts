import { reducedMotion } from './lib'

/** `progress` is the page scroll position (0 → 1), smoothed so scenes feel cinematic. */
export const scene = { progress: 0 }

type FrameListener = (seconds: number) => void
const listeners = new Set<FrameListener>()
let running = false

function loop(now: number) {
  requestAnimationFrame(loop)
  const maxScroll = document.documentElement.scrollHeight - innerHeight || 1
  const target = scrollY / maxScroll
  scene.progress = reducedMotion ? target : scene.progress + (target - scene.progress) * 0.06
  listeners.forEach(fn => fn(now / 1000))
}

/** Subscribe to the single shared animation loop. Returns an unsubscribe function. */
export function onFrame(fn: FrameListener) {
  listeners.add(fn)
  if (!running) { running = true; requestAnimationFrame(loop) }
  return () => { listeners.delete(fn) }
}

export function scrollToFraction(fraction: number) {
  const maxScroll = document.documentElement.scrollHeight - innerHeight
  scrollTo({ top: maxScroll * fraction, behavior: reducedMotion ? 'auto' : 'smooth' })
}
