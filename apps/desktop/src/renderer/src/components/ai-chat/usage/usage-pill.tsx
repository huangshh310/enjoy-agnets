/**
 * L1 账户额度微条：仅 capabilities.quota===true 且 inspect 有官方数字时出现。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { cx } from "@/utils/cx"
import { barWidth, formatQuotaPercent, pickQuotaPercent, pickQuotaWindow } from "../../settings/agent-tools/agent-tool-quota"

export function UsagePill({ runtimeId }: { runtimeId: string }) {
  const caps = capabilitiesFor(runtimeId)
  const snapshot = useSettingsSnapshot()
  const tool = snapshot.data?.agentTools.find((item) => item.id === runtimeId)
  if (!caps.quota) return null

  const loading = snapshot.isInspectingAccounts && !tool?.quotaInfo
  if (loading) return <UsagePillSkeleton />

  const percent = pickQuotaPercent(tool?.quotaInfo, tool?.selectedModel)
  if (percent == null) return null

  const reset = tool?.quotaInfo?.resetsIn || pickQuotaWindow(tool?.quotaInfo, tool?.selectedModel)
  const tone =
    percent >= 85 ? "bg-rose-500" : percent >= 50 ? "bg-amber-500" : "bg-accent-500"

  return (
    <span
      className="inline-flex max-w-[7.5rem] shrink-0 items-center gap-1.5"
      title={reset}
    >
      <span className="h-1 w-8 overflow-hidden rounded-full bg-background-secondary-hover">
        <span className={cx("block h-full rounded-full", tone)} style={{ width: `${barWidth(percent)}%` }} />
      </span>
      <span className="font-mono text-caption-2-medium tabular-nums text-text-secondary">
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
