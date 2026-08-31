/**
 * 展开 / 恢复右栏宽度。图标对齐 Codex：对角箭头外扩与内收。
 */
import { RiCollapseDiagonalLine, RiExpandDiagonalLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"

export function PaneWidthToggle({
  maximized,
  onToggle
}: {
  maximized: boolean
  onToggle: () => void
}) {
  return (
    <QuietIconButton
      icon={maximized ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
      aria-label={maximized ? "Restore panel width" : "Expand panel width"}
      title={maximized ? "恢复面板宽度" : "展开面板宽度"}
      aria-pressed={maximized}
      onClick={onToggle}
      className={maximized ? "bg-background-secondary-default text-text-primary" : undefined}
    />
  )
}
