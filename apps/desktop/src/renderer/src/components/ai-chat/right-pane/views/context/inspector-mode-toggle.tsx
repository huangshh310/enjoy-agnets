/**
 * Context 检查器：仪表盘 / 原始载荷分段。
 */
import type { ReactNode } from "react"
import { RiCodeSSlashLine, RiDashboardLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export type InspectorTabMode = "dashboard" | "raw"

export function InspectorModeToggle({
  tabMode,
  onChange
}: {
  tabMode: InspectorTabMode
  onChange: (mode: InspectorTabMode) => void
}) {
  const t = useT()

  return (
    <div className="inline-flex rounded-lg border border-separator-border/80 bg-background-secondary-default/50 p-0.5 text-caption-2-medium">
      <ModeButton
        active={tabMode === "dashboard"}
        icon={<RiDashboardLine className="size-3 text-accent-500" />}
        label={t("chat.inspectorDashboard")}
        onClick={() => onChange("dashboard")}
      />
      <ModeButton
        active={tabMode === "raw"}
        icon={<RiCodeSSlashLine className="size-3 text-accent-500" />}
        label={t("chat.inspectorRaw")}
        onClick={() => onChange("raw")}
      />
    </div>
  )
}

function ModeButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 transition-all",
        active
          ? "bg-background-primary-default font-semibold text-text-primary shadow-2xs"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
