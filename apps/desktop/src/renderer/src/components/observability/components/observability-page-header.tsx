/**
 * 可观测性舞台顶栏：标题、刷新、视图切换。
 */
import {
  RiDashboardLine,
  RiFileHistoryLine,
  RiFileList3Line,
  RiHardDrive2Line,
  RiRefreshLine,
  RiRouteLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ActiveObservabilityView } from "../types/observability-ui.types"

const VIEW_TABS: Array<{
  id: ActiveObservabilityView
  icon: typeof RiDashboardLine
  labelKey: "viewDashboard" | "navRouting" | "viewTraces" | "viewReplay" | "navCliUsage"
}> = [
  { id: "dashboard", icon: RiDashboardLine, labelKey: "viewDashboard" },
  { id: "routing", icon: RiRouteLine, labelKey: "navRouting" },
  { id: "traces", icon: RiFileList3Line, labelKey: "viewTraces" },
  { id: "replay", icon: RiFileHistoryLine, labelKey: "viewReplay" },
  { id: "cliUsage", icon: RiHardDrive2Line, labelKey: "navCliUsage" }
]

export function ObservabilityPageHeader(props: {
  activeView: ActiveObservabilityView
  isRefreshing: boolean
  onRefresh: () => void
  onViewChange: (view: ActiveObservabilityView) => void
}) {
  const t = useT()
  return (
    <header className="flex shrink-0 flex-col gap-2.5 border-b border-separator-border/70 pb-2">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 data-testid="page-observability" className="text-title-3-semibold tracking-tight text-text-primary">
              {t("pages.observability.title")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded bg-accent-500/10 px-1.5 py-0.5 font-mono text-caption-2-medium text-accent-500">
              <span className="size-1.5 rounded-full bg-accent-500" />
              {t("pages.observability.localApm")}
            </span>
          </div>
          <p className="text-caption-2-medium text-text-tertiary">{t("pages.observability.subtitle")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={props.onRefresh}
          disabled={props.isRefreshing}
          className="h-7.5 shrink-0 gap-1.5 text-caption-2-medium"
        >
          <RiRefreshLine className={cx("size-3.5", props.isRefreshing && "animate-spin")} />
          <span>{t("pages.observability.refreshMetrics")}</span>
        </Button>
      </div>
      <div className="flex items-center gap-1 pt-1">
        {VIEW_TABS.map((tab) => (
          <ViewTab
            key={tab.id}
            active={props.activeView === tab.id}
            icon={tab.icon}
            label={t(`pages.observability.${tab.labelKey}`)}
            onClick={() => props.onViewChange(tab.id)}
          />
        ))}
      </div>
    </header>
  )
}

function ViewTab(props: {
  active: boolean
  icon: typeof RiDashboardLine
  label: string
  onClick: () => void
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-caption-2-medium transition-all",
        props.active
          ? "bg-background-secondary-default font-semibold text-text-primary shadow-2xs"
          : "text-text-secondary hover:text-text-primary"
      )}
    >
      <Icon className="size-3.5" />
      <span>{props.label}</span>
    </button>
  )
}
