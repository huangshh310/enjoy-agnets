/**
 * 一枚或多枚按键胶囊。未分配时不画键。
 */
import { chordGlyphs } from "./keybinding-format"

export function KeybindingKeys({ chord }: { chord: string }) {
  const glyphs = chordGlyphs(chord)
  if (glyphs.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1">
      {glyphs.map((glyph, index) => (
        <kbd
          key={`${glyph}-${index}`}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-border-button-default bg-background-secondary-default px-1.5 font-mono text-caption-2-semibold text-text-primary shadow-2xs select-none"
        >
          {glyph}
        </kbd>
      ))}
    </span>
  )
}
