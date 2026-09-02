/**
 * 语言切换细描边字标：中（口+竖）与 A。currentColor，16 视口。
 */
import { cx } from "@/utils/cx"

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function ZhGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cx("size-3.5", className)} aria-hidden="true">
      <g {...stroke}>
        <rect x="4.1" y="5.1" width="7.8" height="6.4" rx="0.6" />
        <path d="M8 3.2v10.2" />
      </g>
    </svg>
  )
}

export function EnGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cx("size-3.5", className)} aria-hidden="true">
      <path
        {...stroke}
        d="M8 3.3 12.4 13M8 3.3 3.6 13M5.15 10.15h5.7"
      />
    </svg>
  )
}
