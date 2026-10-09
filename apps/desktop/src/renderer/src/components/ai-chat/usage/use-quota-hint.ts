/**
 * 账户额度只给芯片悬停 / Popover，禁止再占铬条第二行。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { pickQuotaPercent, pickQuotaWindow } from "../../settings/agent-tools/agent-tool-quota"
import type { UsageNumberMode } from "./quota-hint-text"

export function useQuotaHint(runtimeId: string): {
  percent: number | null
  reset?: string
  loading: boolean
  usageNumber: UsageNumberMode
} {
  const caps = capabilitiesFor(runtimeId)
  const snapshot = useSettingsSnapshot()
  const usageNumber = snapshot.data?.preferences.usageNumber ?? "used"
  const tool = snapshot.data?.agentTools.find((item) => item.id === runtimeId)
  if (!caps.quota) return { percent: null, loading: false, usageNumber }
  const loading = snapshot.isInspectingAccounts && !tool?.quotaInfo
  if (loading) return { percent: null, loading: true, usageNumber }
  const percent = pickQuotaPercent(tool?.quotaInfo, tool?.selectedModel)
  if (percent == null) return { percent: null, loading: false, usageNumber }
  return {
    percent,
    reset: tool?.quotaInfo?.resetsIn || pickQuotaWindow(tool?.quotaInfo, tool?.selectedModel),
    loading: false,
    usageNumber
  }
}

