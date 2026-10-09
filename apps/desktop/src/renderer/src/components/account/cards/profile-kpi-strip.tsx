/**
 * 个人中心 6 栏核心效能 KPI 磁贴栏：
 * 展示年度贡献、累计 Token、峰值 Token、智能体调度、最长连击与单次任务最长链路。
 */
import {
  RiFireLine,
  RiFlashlightLine,
  RiMoneyDollarCircleLine,
  RiStackLine,
  RiTimeLine,
  RiTokenSwapLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { growthBadgeClass } from "../constants"
import { formatContributionUsd } from "../lib/profile-metrics"
import type { ProfileMetricSummary } from "../types/profile.types"

interface ProfileKpiStripProps {
  summary: ProfileMetricSummary
  totalAgentsCount: number
}

export function ProfileKpiStrip({ summary, totalAgentsCount }: ProfileKpiStripProps) {
  const t = useT()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {/* 1. 年度贡献 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-accent-500/30">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">{t("pages.account.hero.contributions")}</span>
          <RiMoneyDollarCircleLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-title-2-semibold tracking-tight text-text-primary">
            {formatContributionUsd(summary.contributionsCount)}
          </span>
          <span
            className={cx(
              "inline-flex items-center rounded-md px-1.5 py-0.2 font-mono text-caption-2-semibold font-semibold",
              growthBadgeClass(summary.contributionsGrowth, "success")
            )}
          >
            {summary.contributionsGrowth}
          </span>
        </div>
        <span className="mt-1 text-caption-2-regular text-text-tertiary">年度开发贡献</span>
      </div>

      {/* 2. 累计 Token */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-accent-500/30">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">{t("pages.account.hero.lifetimeTokens")}</span>
          <RiTokenSwapLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-title-2-semibold tracking-tight text-text-primary">
            {summary.lifetimeTokens}
          </span>
          <span className="font-mono text-caption-2-regular text-text-tertiary">Tokens</span>
        </div>
        <span className="mt-1 text-caption-2-regular text-text-tertiary">上下文总吞吐</span>
      </div>

      {/* 3. 峰值 Token */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-accent-500/30">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">{t("pages.account.hero.peakTokens")}</span>
          <RiFlashlightLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-title-2-semibold tracking-tight text-text-primary">
            {summary.peakTokens}
          </span>
          <span className="font-mono text-caption-2-regular text-text-tertiary">单轮最高</span>
        </div>
        <span className="mt-1 text-caption-2-regular text-text-tertiary">高负载深度推理</span>
      </div>

      {/* 4. 智能体总调度 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-accent-500/30">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">{t("pages.account.charts.agents")}</span>
          <RiStackLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-title-2-semibold tracking-tight text-text-primary">
            {totalAgentsCount}
          </span>
          <span className="font-mono text-caption-2-regular text-text-tertiary">{t("pages.account.charts.runsUnit")}</span>
        </div>
        <span className="mt-1 text-caption-2-regular text-text-tertiary">智能体调度执行</span>
      </div>

      {/* 5. 最长连续天数 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-accent-500/30">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">{t("pages.account.hero.topStreak")}</span>
          <RiFireLine className="size-4 text-status-yellow-text" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-title-2-semibold tracking-tight text-text-primary">
            {summary.topStreakDays}
          </span>
          <span className="font-mono text-caption-2-regular text-text-tertiary">连续编码</span>
        </div>
        <span className="mt-1 text-caption-2-regular text-text-tertiary">保持开发节奏</span>
      </div>

      {/* 6. 最长任务链路 */}
      <div className="flex flex-col justify-between rounded-2xl border border-separator-border/80 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-accent-500/30">
        <div className="flex items-center justify-between text-text-tertiary">
          <span className="text-caption-2-medium font-medium">{t("pages.account.hero.longestTask")}</span>
          <RiTimeLine className="size-4 text-accent-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-title-2-semibold tracking-tight text-text-primary">
            {summary.longestTaskDuration}
          </span>
        </div>
        <span className="mt-1 text-caption-2-regular text-text-tertiary">单次深度工作流</span>
      </div>
    </div>
  )
}
