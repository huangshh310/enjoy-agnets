/**
 * 账户额度只给芯片悬停 / Popover，禁止再占铬条第二行。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { formatQuotaPercent, pickQuotaPercent, pickQuotaWindow } from "../../settings/agent-tools/agent-tool-quota"

export function useQuotaHint(runtimeId: string): {
  percent: number | null
  reset?: string
  loading: boolean
} {
  const caps = capabilitiesFor(runtimeId)
  const snapshot = useSettingsSnapshot()
  const tool = snapshot.data?.agentTools.find((item) => item.id === runtimeId)
  if (!caps.quota) return { percent: null, loading: false }
  const loading = snapshot.isInspectingAccounts && !tool?.quotaInfo
  if (loading) return { percent: null, loading: true }
  const percent = pickQuotaPercent(tool?.quotaInfo, tool?.selectedModel)
  if (percent == null) return { percent: null, loading: false }
  return {
    percent,
    reset: tool?.quotaInfo?.resetsIn || pickQuotaWindow(tool?.quotaInfo, tool?.selectedModel),
    loading: false
  }
}

export function quotaHintText(
  percent: number | null,
  reset: string | undefined,
  used: (percent: string) => string
): string | undefined {
  if (percent == null) return reset
  const line = used(formatQuotaPercent(percent))
  return reset ? `${line} · ${reset}` : line
}
