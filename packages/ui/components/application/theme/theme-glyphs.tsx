/**
 * 明暗切换用的细描边太阳 / 月亮。currentColor，16 视口。
 */
import { cx } from "@/utils/cx"

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function SunGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cx("size-3.5", className)} aria-hidden="true">
      <g {...stroke}>
        <circle cx="8" cy="8" r="2.45" />
        <path d="M8 2.2v1.35M8 12.45V13.8M2.2 8h1.35M12.45 8H13.8M3.85 3.85l.95.95M11.2 11.2l.95.95M3.85 12.15l.95-.95M11.2 4.8l.95-.95" />
      </g>
    </svg>
  )
}

export function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cx("size-3.5", className)} aria-hidden="true">
      <path
        {...stroke}
        d="M9.55 3.15a5 5 0 1 0 3.35 8.55 4.15 4.15 0 0 1-3.35-8.55z"
      />
    </svg>
  )
}
