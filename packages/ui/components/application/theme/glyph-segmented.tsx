/**
 * 双格细环分段：选中格浅底，不要粗灰胶囊。
 */
import type { MouseEvent, ReactNode } from "react"
import { cx } from "@/utils/cx"

export type GlyphSegmentedOption = {
  id: string
  label: string
  title?: string
  glyph: ReactNode
}

export function GlyphSegmented({
  value,
  options,
  onSelect,
  ariaLabel,
  className
}: {
  value: string
  options: GlyphSegmentedOption[]
  onSelect: (id: string, event: MouseEvent<HTMLButtonElement>) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        "inline-flex items-center gap-0.5 rounded-full p-0.5 ring-1 ring-inset ring-border-button-default",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            title={option.title ?? option.label}
            onClick={(event) => onSelect(option.id, event)}
            className={cx(
              "grid size-7 cursor-pointer place-items-center rounded-full outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              selected
                ? "bg-background-primary-default text-foreground-icon-primary shadow-2xs"
                : "text-foreground-icon-tertiary hover:text-foreground-icon-secondary"
            )}
          >
            {option.glyph}
          </button>
        )
      })}
    </div>
  )
}
