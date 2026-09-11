/**
 * Codex 速率重置：一行可用次数。没有 IPC 兑换前只展示数字，不画假按钮。
 */
import type { AgentToolQuotaInfo } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"

export function RateLimitResetsCard({
  resetCredits
}: {
  resetCredits: NonNullable<AgentToolQuotaInfo["resetCredits"]>
}) {
  const t = useT()
  const count = resetCredits.availableCount
  if (count <= 0) return null
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-caption-2-medium">
      <span className="text-caption-1-medium text-text-primary">{t("settings.subscriptions.resets")}</span>
      <span className="tabular-nums text-text-primary">
        {t("settings.subscriptions.resetsAvailable", { n: count })}
      </span>
    </div>
  )
}
