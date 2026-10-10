import { useRef, type ReactNode } from 'react'
import { ICONS } from './icons'
import { useSceneFade } from './hooks'

// [name, icon key]. Icons live in icons.ts; names show on hover/focus.
const LANGUAGES: [string, string][] = [
  ['Python', 'python'], ['Java', 'java'], ['JavaScript', 'js'], ['TypeScript', 'ts'], ['HTML', 'html'],
  ['CSS', 'css'], ['MySQL', 'mysql'], ['MongoDB', 'mongodb'], ['Linux', 'linux'],
]
const TOOLS: [string, string][] = [
  ['React', 'react'], ['Spring Boot', 'spring'], ['Tailwind CSS', 'tailwind'], ['shadcn/ui', 'shadcn'], ['Docker', 'docker'],
  ['Git', 'git'], ['GitHub', 'github'], ['IntelliJ IDEA', 'intellij'], ['VS Code', 'vscode'], ['Vercel', 'vercel'],
]
// Soft skills use simple line icons (SVG paths on a 24x24 grid)
const SOFT: [string, ReactNode][] = [
  ['Communication', <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.2A8 8 0 1 1 21 12z" />],
  ['Leadership', <path d="M5 21V4M5 4h11l-2 4 2 4H5" />],
  ['Problem Solving', <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />],
  ['Teamwork', <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.2c3 0 6 1.8 6 5.8" /></>],
  ['Adaptability', <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />],
  ['Time Management', <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>],
]

const IconList = ({ items }: { items: [string, string][] }) => (
  <ul>
    {items.map(([name, key]) => (
      <li key={name} tabIndex={0} aria-label={name}><img alt="" src={ICONS[key]} /><span>{name}</span></li>
    ))}
  </ul>
)

export default function Skills() {
  const ref = useRef<HTMLElement>(null)
  useSceneFade(ref, [0.7, 0.75, 0.82, 0.87])
  return (
    <section id="skills" ref={ref} className="fx" aria-label="My skills">
      <div className="mono">My skills — hover for names</div>
      <div className="mono sub">Languages &amp; databases</div><IconList items={LANGUAGES} />
      <div className="mono sub">Frameworks &amp; tools</div><IconList items={TOOLS} />
      <div className="mono sub">Beyond code</div>
      <ul>
        {SOFT.map(([name, shape]) => (
          <li key={name} tabIndex={0} aria-label={name}><svg viewBox="0 0 24 24" aria-hidden="true">{shape}</svg><span>{name}</span></li>
        ))}
      </ul>
    </section>
  )
}
