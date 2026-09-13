/**
 * 个人中心贡献与活跃矩阵看板：
 * 将年度贡献总额、同比增速、活跃度周期筛选与 GitHub 级 Activity Matrix 融为一体。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ProfileActivityHeatmap } from "../charts/profile-activity-heatmap"
import { growthBadgeClass } from "../constants"
import { formatContributionUsd } from "../lib/profile-metrics"
import type { HeatmapCellData, HeatmapPeriod, ProfileMetricSummary } from "../types/profile.types"

interface ProfileActivityCardProps {
  summary: ProfileMetricSummary
  heatmapData: HeatmapCellData[]
  heatmapPeriod: HeatmapPeriod
  onPeriodChange: (period: HeatmapPeriod) => void
}

export function ProfileActivityCard({
  summary,
  heatmapData,
  heatmapPeriod,
  onPeriodChange
}: ProfileActivityCardProps) {
  const t = useT()

  return (
    <div className="flex select-none flex-col rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[11px] font-medium text-text-tertiary">
              {t("pages.account.hero.contributions")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-title-2-semibold tracking-tight text-text-primary">
                {formatContributionUsd(summary.contributionsCount)}
              </span>
              <span
                className={cx(
                  "inline-flex items-center rounded-md px-1.5 py-0.2 font-mono text-[11px] font-semibold",
                  growthBadgeClass(summary.contributionsGrowth, "success")
                )}
              >
                {summary.contributionsGrowth}
              </span>
            </div>
          </div>
        </div>

        {/* 活跃度周期切换 */}
        <div className="flex items-center rounded-lg border border-separator-border/70 bg-background-secondary-default/60 p-0.5 text-caption-2-medium">
          {(["weekly", "monthly", "yearly"] as HeatmapPeriod[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPeriodChange(item)}
              className={cx(
                "cursor-pointer rounded-md px-2 py-0.5 capitalize transition-all",
                heatmapPeriod === item
                  ? "bg-background-primary-default text-text-primary shadow-2xs font-semibold"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 border-t border-separator-border/50 pt-1">
        <ProfileActivityHeatmap
          data={heatmapData}
          period={heatmapPeriod}
          onPeriodChange={onPeriodChange}
          hideHeader
        />
      </div>
    </div>
  )
}
