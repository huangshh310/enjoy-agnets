/**
 * 智能体配置抽屉内的「用量与额度」专属板块：
 * 集成官方额度窗口（进度条/重置倒计时）、本地消耗汇总（今日/昨日/30天）、趋势 Sparkline 与官方账单外链。
 */
import { useState } from "react"
import {
  RiArrowRightUpLine,
  RiExternalLinkLine,
  RiPieChartLine
} from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { formatSpendLine, formatTokens } from "./format-spend"
import { RateLimitResetsCard } from "./rate-limit-resets-card"
import { SubscriptionQuotaMeter } from "./subscription-quota-meter"
import { UsageTrendSparkline } from "./usage-trend-sparkline"

const PROVIDER_LINKS: Record<string, { label: string; href: string }[]> = {
  cursor: [
    { label: "Status", href: "https://cursor.com/dashboard" },
    { label: "Dashboard", href: "https://cursor.com/dashboard?tab=usage" }
  ],
  grok: [{ label: "Usage", href: "https://grok.com" }],
  claude: [{ label: "Usage", href: "https://claude.ai/settings/usage" }],
  codex: [{ label: "ChatGPT Usage", href: "https://chatgpt.com" }],
  antigravity: [{ label: "AI Studio", href: "https://aistudio.google.com" }],
  gemini: [{ label: "AI Studio", href: "https://aistudio.google.com" }],
  deepseek: [{ label: "Platform Usage", href: "https://platform.deepseek.com/usage" }]
}

export function AgentToolUsageSection({
  tool,
  onViewDashboard
}: {
  tool: AgentToolPublic
  onViewDashboard?: () => void
}) {
  const t = useT()
  const [showLeft, setShowLeft] = useState(true)
  const [showExactReset, setShowExactReset] = useState(false)

  const quota = tool.quotaInfo
  const windows = quota?.windows ?? []
  const alwaysWindows = windows.filter((item) => item.windowType !== "other")
  const spend = quota?.spend
  const hasSpend = Boolean(
    (spend?.last30Days?.tokens ?? 0) > 0 ||
      (spend?.today?.tokens ?? 0) > 0 ||
      (spend?.yesterday?.tokens ?? 0) > 0 ||
      (spend?.trend30Days?.length ?? 0) > 0
  )
  const hasQuota = Boolean(windows.length > 0 || (quota?.usedPercent != null && quota.usedPercent > 0))
  const links = PROVIDER_LINKS[tool.id] ?? []

  return (
    <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-3.5">
      {/* 标题栏 */}
      <div className="flex items-center justify-between pb-2.5 border-b border-separator-border/60">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600">
            <RiPieChartLine className="size-4" />
          </div>
          <div>
            <h3 className="text-body-medium font-semibold text-text-primary">
              {t("settings.agentTools.usageSectionTitle")}
            </h3>
            <p className="text-caption-2-regular text-text-tertiary">
              {t("settings.agentTools.usageSectionDesc")}
            </p>
          </div>
        </div>
        {onViewDashboard ? (
          <button
            type="button"
            onClick={onViewDashboard}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption-2-medium text-accent-600 hover:bg-accent-500/10 transition-colors"
            title={t("settings.agentTools.usageViewDashboard")}
          >
            <span>{t("settings.agentTools.tabSubscriptions")}</span>
            <RiArrowRightUpLine className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* 官方额度窗口（若有） */}
      {alwaysWindows.length > 0 ? (
        <div className="py-2.5 border-b border-separator-border/40">
          <div className="space-y-2">
            {alwaysWindows.map((item) => (
              <SubscriptionQuotaMeter
                key={item.id || item.name}
                window={item}
                showLeft={showLeft}
                onToggleLeft={() => setShowLeft((v) => !v)}
                showExactReset={showExactReset}
                onToggleExact={() => setShowExactReset((v) => !v)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* 速率重置凭据（若有） */}
      {quota?.resetCredits ? (
        <div className="py-2.5 border-b border-separator-border/40">
          <RateLimitResetsCard resetCredits={quota.resetCredits} />
        </div>
      ) : null}

      {/* 30 天走势折线图与近期消耗 */}
      {hasSpend ? (
        <div className="pt-2.5 space-y-2.5">
          {spend?.trend30Days?.length ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-caption-2-medium text-text-tertiary">
                <span>{t("settings.subscriptions.trend")}</span>
                <span className="tabular-nums font-mono text-text-secondary">
                  {formatTokens(spend.last30Days?.tokens)}
                </span>
              </div>
              <UsageTrendSparkline spend={spend} />
            </div>
          ) : null}

          {/* 今日 / 昨日 / 30 天消耗汇总网格 */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-background-secondary-default/40 p-2 text-center">
            <div>
              <span className="block text-caption-2-regular text-text-tertiary">
                {t("settings.subscriptions.todayRow")}
              </span>
              <span className="block text-caption-1-medium tabular-nums text-text-primary mt-0.5">
                {formatSpendLine(spend?.today?.costUsd, spend?.today?.tokens) ?? t("settings.subscriptions.noData")}
              </span>
            </div>
            <div>
              <span className="block text-caption-2-regular text-text-tertiary">
                {t("settings.subscriptions.yesterdayRow")}
              </span>
              <span className="block text-caption-1-medium tabular-nums text-text-primary mt-0.5">
                {formatSpendLine(spend?.yesterday?.costUsd, spend?.yesterday?.tokens) ?? t("settings.subscriptions.noData")}
              </span>
            </div>
            <div>
              <span className="block text-caption-2-regular text-text-tertiary">
                {t("settings.subscriptions.last30Row")}
              </span>
              <span className="block text-caption-1-medium tabular-nums text-text-primary mt-0.5">
                {formatSpendLine(spend?.last30Days?.costUsd, spend?.last30Days?.tokens) ?? t("settings.subscriptions.noData")}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 若既无官方额度、又无本地消耗 */}
      {!hasQuota && !hasSpend ? (
        <div className="py-3 text-center">
          <p className="text-caption-2-regular text-text-tertiary">
            {t("settings.agentTools.usageNoLocalSpend")}
          </p>
        </div>
      ) : null}

      {/* 官方账单与控制台直达外链 */}
      {links.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-separator-border/40">
          <span className="text-caption-2-regular text-text-tertiary">快捷入口：</span>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border-button-default bg-background-secondary-default/50 px-2 py-0.5 text-caption-2-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
            >
              <span>{link.label}</span>
              <RiExternalLinkLine className="size-3 text-text-tertiary" />
            </a>
          ))}
        </div>
      ) : null}
    </section>
  )
}
