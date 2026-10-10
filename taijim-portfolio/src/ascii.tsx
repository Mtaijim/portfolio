import type { ReactNode } from 'react'

/** Block-letter glyphs (figlet "ANSI Shadow" style). Each glyph is 6 rows tall. */
const GLYPHS: Record<string, string[]> = {"M": ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"], ".": ["   ", "   ", "   ", "   ", "██╗", "╚═╝"], "T": ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "], "A": [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"], "I": ["██╗", "██║", "██║", "██║", "██║", "╚═╝"], "J": ["     ██╗", "     ██║", "     ██║", "██   ██║", "╚█████╔╝", " ╚════╝ "], " ": ["  ", "  ", "  ", "  ", "  ", "  "]}

/** Renders text as ASCII art, one <span> per letter so letters can be animated. */
export function AsciiText({ text, className }: { text: string; className: string }): ReactNode {
  return [...text].map((ch, i) => (
    <span key={i} className={className} aria-hidden="true">{GLYPHS[ch].join('\n')}</span>
  ))
}
