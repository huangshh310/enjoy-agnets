/**
 * 智能体列表行内的微型配额胶囊（Mini Quota Capsule）。
 * 对标 OpenUsage：在表格中一眼看清配额消耗率、重置倒计时、燃尽告警与可用重置点。
 */
import { RiFireLine, RiFlashlightLine } from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { shownQuotaPercent } from "@renderer/components/ai-chat/usage/quota-hint-text"

export function AgentToolMiniQuota({ tool }: { tool: AgentToolPublic }) {
  const usageNumber = useSettingsSnapshot().data?.preferences.usageNumber ?? "used"
  const quota = tool.quotaInfo
  if (!quota) return null

  const primaryWindow = quota.windows?.[0]
  const used = primaryWindow?.usedPercent ?? quota.usedPercent
  if (used == null && !quota.resetCredits?.availableCount) return null

  const status = primaryWindow?.pacing?.status ?? "safe"
  const resetsIn = primaryWindow?.resetsIn ?? quota.resetsIn
  const resetCreditsCount = quota.resetCredits?.availableCount ?? 0

  let bgTone = "bg-background-secondary-default text-text-secondary border-border-button-default"
  if (status === "danger" || status === "exhausted") {
    bgTone = "bg-background-tertiary-error text-text-error-primary border-border-error-default"
  } else if (status === "warning") {
    bgTone = "bg-background-secondary-default text-status-yellow-text border-separator-border"
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {used != null ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-caption-2-medium tabular-nums shadow-2xs ${bgTone}`}
          title={primaryWindow?.displayName || quota.windowType || "Quota"}
        >
          {status === "danger" || status === "exhausted" ? (
            <RiFireLine className="size-3 text-text-error-primary" />
          ) : null}
          <span>{shownQuotaPercent(used, usageNumber)}%</span>
          {resetsIn ? <span className="opacity-70">· {resetsIn}</span> : null}
          {primaryWindow?.pacing?.cushionPercent != null && status === "safe" && used > 0 ? (
            <span className="text-caption-2-medium opacity-60">~{primaryWindow.pacing.cushionPercent}%</span>
          ) : null}
        </span>
      ) : null}

      {resetCreditsCount > 0 ? (
        <span
          className="inline-flex items-center gap-0.5 rounded-full border border-accent-500/30 bg-accent-500/10 px-1.5 py-0.5 font-mono text-caption-2-medium text-accent-600 shadow-2xs"
          title={`${resetCreditsCount} 次速率限制重置机会可用`}
        >
          <RiFlashlightLine className="size-2.5 text-accent-500" />
          <span>{resetCreditsCount}点重置</span>
        </span>
      ) : null}
    </div>
  )
}
