/**
 * 助手行归属：终态 / 别的 run 不得被下一轮 UPDATE。
 */
import { parseAssistantPayload } from "@enjoy-agents/ipc-contract"
import { RESTART_ABANDONED_CODE, toolHasResultCode } from "@enjoy-agents/ipc-contract/desktop-notify"

export function isTerminalRestartAssistant(content: string): boolean {
  const tools = parseAssistantPayload(content).tools ?? []
  return tools.some((tool) => toolHasResultCode(tool, RESTART_ABANDONED_CODE))
}

export function canReuseAssistantRow(content: string, runId?: string): boolean {
  if (isTerminalRestartAssistant(content)) return false
  const owned = parseAssistantPayload(content).runId?.trim()
  if (owned && runId && owned !== runId) return false
  return true
}
