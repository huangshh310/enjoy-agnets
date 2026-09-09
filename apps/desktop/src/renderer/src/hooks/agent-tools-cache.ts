/**
 * 最近一次设置快照里的本机 CLI 表。发送口不能用 hook，只读这份缓存。
 */
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

let cached: AgentToolPublic[] = []

export function rememberAgentTools(tools: AgentToolPublic[]): void {
  cached = tools
}

export function rememberedAgentTool(id: string): AgentToolPublic | undefined {
  return cached.find((item) => item.id === id)
}
