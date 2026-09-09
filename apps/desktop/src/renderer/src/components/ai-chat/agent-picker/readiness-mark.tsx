/**
 * 导轨 / 安装面的就绪胶囊。未装用中性标，不要名字底下第二行灰字。
 */
import { cx } from "@/utils/cx"
import type { EngineReadiness } from "./engine-readiness"

export function ReadinessMark({
  kind,
  label
}: {
  kind: EngineReadiness
  label: string
}) {
  if (kind === "ready" || !label) return null
  return (
    <span
      className={cx(
        "shrink-0 rounded-full px-1.5 py-px text-caption-2-medium",
        kind === "needs_login"
          ? "bg-badge-new-background text-badge-new-text"
          : "bg-badge-neutral-background text-text-secondary"
      )}
    >
      {label}
    </span>
  )
}
