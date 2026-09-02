/**
 * Studio 顶部分段控制器：4 大领域工坊快速切换，支持微标与状态点。
 */
import {
  RiDashboardLine,
  RiDatabase2Line,
  RiPlugLine,
  RiPulseLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { StudioDashboardData, StudioTab } from "./studio.types"

export function StudioNavTabs({
  activeTab,
  onSelectTab,
  dash
}: {
  activeTab: StudioTab
  onSelectTab: (tab: StudioTab) => void
  dash: StudioDashboardData
}) {
  const t = useT()

  const tabs: Array<{
    id: StudioTab
    label: string
    icon: typeof RiDashboardLine
    badge?: string | number
    pulse?: boolean
  }> = [
    {
      id: "overview",
      label: t("studio.header.tabs.overview"),
      icon: RiDashboardLine
    },
    {
      id: "grounding",
      label: t("studio.header.tabs.grounding"),
      icon: RiDatabase2Line,
      badge: dash.sources.length ? `${dash.sources.length}源` : undefined
    },
    {
      id: "extensions",
      label: t("studio.header.tabs.extensions"),
      icon: RiPlugLine,
      badge: dash.connectedServers.length
        ? `${dash.connectedServers.length}连`
        : dash.automations.length
          ? `${dash.automations.length}规`
          : undefined
    },
    {
      id: "ops",
      label: t("studio.header.tabs.ops"),
      icon: RiPulseLine,
      pulse: dash.runningWorkflows.length > 0
    }
  ]

  return (
    <nav
      aria-label="Studio navigation"
      className="inline-flex items-center gap-1 rounded-2xl border border-border-button-default/50 bg-background-secondary-default/60 p-1 shadow-2xs backdrop-blur-sm"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cx(
              "relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-caption-1-medium transition-all select-none cursor-pointer outline-none",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              isActive
                ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                : "text-text-secondary hover:bg-background-primary-default/50 hover:text-text-primary"
            )}
          >
            <Icon
              className={cx(
                "size-4 transition-colors",
                isActive ? "text-accent-500" : "text-text-tertiary"
              )}
              aria-hidden="true"
            />
            <span>{tab.label}</span>
            {tab.pulse ? (
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : null}
            {tab.badge ? (
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  isActive
                    ? "bg-background-secondary-default text-text-secondary"
                    : "bg-background-primary-default text-text-tertiary"
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
