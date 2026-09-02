/**
 * 展开 / 恢复右栏宽度。图标对齐 Codex：对角箭头外扩与内收。
 */
import { RiCollapseDiagonalLine, RiExpandDiagonalLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { useT } from "@renderer/i18n"

export function PaneWidthToggle({
  maximized,
  onToggle
}: {
  maximized: boolean
  onToggle: () => void
}) {
  const t = useT()
  return (
    <QuietIconButton
      icon={maximized ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
      aria-label={maximized ? t("chat.restoreWidth") : t("chat.expandWidth")}
      title={maximized ? t("chat.restoreWidth") : t("chat.expandWidth")}
      aria-pressed={maximized}
      onClick={onToggle}
      className={maximized ? "bg-background-secondary-default text-text-primary" : undefined}
    />
  )
}
