/**
 * 设置快照：输入框审批开关与 Settings 页共用同一 query。
 * 账号 / 动态模型在 PATH 列表之后异步合并，避免 settings.get 卡住。
 */
import { useQuery } from "@tanstack/react-query"
import type { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { useChatStore } from "../stores/chat-store"
import { rememberAgentTools } from "./agent-tools-cache"
import { rememberCodingRuntime } from "./chat-readiness-cache"
import { applyInspect } from "./merge-agent-tool-inspect"
import { useAgentToolsInspect } from "./use-agent-tools-inspect"

export function useSettingsSnapshot() {
  const runtimeId = useChatStore((state) => state.runtimeId)
  const settings = useQuery({
    queryKey: ["settings"],
    enabled: hasIde(),
    queryFn: () => getIde().settings.get() as Promise<SettingsSnapshot>
  })
  const inspect = useAgentToolsInspect(settings.data?.agentTools ?? [], runtimeId)
  const tools = settings.data
    ? applyInspect(settings.data.agentTools, inspect.data, settings.data.providers)
    : undefined
  if (tools) rememberAgentTools(tools)
  if (settings.data?.preferences.codingRuntime) {
    rememberCodingRuntime(settings.data.preferences.codingRuntime)
  }
  const data = settings.data && tools ? { ...settings.data, agentTools: tools } : undefined
  return { ...settings, data, isInspectingAccounts: inspect.isFetching }
}

/** 合并写回偏好并保持默认值安全。 */
export async function patchPreferences(
  patch: Partial<SettingsSnapshot["preferences"]>
) {
  if (!hasIde()) return
  await getIde().settings.setPreferences(patch)
}
