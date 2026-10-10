/** Keep x between min and max. */
export const clamp = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))

/** Smooth 0 → 1 ramp while x travels from a to b. */
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, reducedMotion ? 0 : ms))
/** Animation duration helper: near-instant when the visitor prefers reduced motion. */
export const ms = (n: number) => (reducedMotion ? 1 : n)
