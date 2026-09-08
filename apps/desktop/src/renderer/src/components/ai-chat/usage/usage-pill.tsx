/**
 * L1 账户额度微条：仅 capabilities.quota===true 且 inspect 有官方数字时出现。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { barWidth, formatQuotaPercent, pickQuotaPercent, pickQuotaWindow } from "../../settings/agent-tools/agent-tool-quota"
import { usagePillTone } from "./usage-pill-tone"

const BAR_TONE = {
  alert: "bg-text-error-primary",
  mid: "bg-text-secondary",
  low: "bg-accent-500",
  quiet: "bg-text-tertiary"
} as const

export function UsagePill({ runtimeId }: { runtimeId: string }) {
  const caps = capabilitiesFor(runtimeId)
  const snapshot = useSettingsSnapshot()
  const emptyThread = useChatStore((state) => state.messages.length === 0)
  const tool = snapshot.data?.agentTools.find((item) => item.id === runtimeId)
  if (!caps.quota) return null

  const loading = snapshot.isInspectingAccounts && !tool?.quotaInfo
  if (loading) return <UsagePillSkeleton />

  const percent = pickQuotaPercent(tool?.quotaInfo, tool?.selectedModel)
  if (percent == null) return null

  const reset = tool?.quotaInfo?.resetsIn || pickQuotaWindow(tool?.quotaInfo, tool?.selectedModel)
  const tone = usagePillTone(percent, emptyThread)

  return (
    <span
      className={cx("inline-flex max-w-[7.5rem] shrink-0 items-center gap-1.5", tone === "quiet" && "opacity-70")}
      title={reset}
    >
      <span className="h-1 w-8 overflow-hidden rounded-full bg-background-secondary-hover">
        <span className={cx("block h-full rounded-full", BAR_TONE[tone])} style={{ width: `${barWidth(percent)}%` }} />
      </span>
      <span
        className={cx(
          "font-mono text-caption-2-medium tabular-nums",
          tone === "alert" ? "text-text-error-primary" : tone === "quiet" ? "text-text-tertiary" : "text-text-secondary"
        )}
      >
        {formatQuotaPercent(percent)}
      </span>
    </span>
  )
}

function UsagePillSkeleton() {
  return (
    <span
      className="inline-flex h-3 w-12 shrink-0 animate-pulse rounded-full bg-background-secondary-hover"
      aria-hidden
    />
  )
}
