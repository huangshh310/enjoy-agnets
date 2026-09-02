/**
 * Studio 紧凑型全景条：单行指标胶囊，极大节省垂直视口。
 */
import {
  RiBookOpenLine,
  RiDatabase2Line,
  RiFlashlightLine,
  RiFolder6Line,
  RiPlugLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { StudioDashboardData } from "./studio.types"

export function StudioCompactHero({
  workspaceName,
  dash
}: {
  workspaceName: string
  dash: StudioDashboardData
}) {
  const t = useT()

  return (
    <header className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-button-default/50 bg-background-primary-default px-5 py-3.5 shadow-2xs">
      {/* 左侧：工作区与核心引擎状态 */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <RiFolder6Line className="size-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-title-3-semibold text-text-primary tracking-tight">
              {workspaceName || t("studio.hero.unnamedWorkspace")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("studio.hero.localFirstActive")}
            </span>
          </div>
          <span className="text-caption-2-regular text-text-tertiary">
            {t("studio.hero.tagline")}
          </span>
        </div>
      </div>

      {/* 右侧：高密度轻量指标舱 */}
      <div className="flex flex-wrap items-center gap-2">
        <MiniMetricPill
          icon={RiBookOpenLine}
          label={t("studio.hero.ragSources")}
          value={`${dash.sources.length} / ${dash.totalChunks}`}
        />
        <MiniMetricPill
          icon={RiPlugLine}
          label={t("studio.hero.mcpStatus")}
          value={`${dash.connectedServers.length}/${dash.mcpServers.length} (${dash.totalMcpTools})`}
        />
        <MiniMetricPill
          icon={RiFlashlightLine}
          label={t("studio.hero.automations")}
          value={`${dash.automations.length}`}
        />
        {dash.latestMetric ? (
          <MiniMetricPill
            icon={RiDatabase2Line}
            label={t("studio.hero.latestPerf")}
            value={`${dash.latestMetric.durationMs}ms`}
          />
        ) : null}
      </div>
    </header>
  )
}

function MiniMetricPill({
  icon: Icon,
  label,
  value
}: {
  icon: typeof RiFolder6Line
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-button-default/40 bg-background-secondary-default/50 px-2.5 py-1 text-caption-1-medium text-text-secondary">
      <Icon className="size-3.5 text-text-tertiary" aria-hidden="true" />
      <span className="text-text-tertiary">{label}</span>
      <span className="font-semibold text-text-primary font-mono">{value}</span>
    </div>
  )
}
