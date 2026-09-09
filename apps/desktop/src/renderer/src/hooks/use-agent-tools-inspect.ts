/**
 * 已就绪的登录型 CLI：异步补账号 / 额度 / 账号侧模型表。
 * 一家失败不能挡住当前引擎。
 */
import { useQuery } from "@tanstack/react-query"
import type { AgentToolPublic, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { orderInspectTargets, settledInspectResults, shouldInspect } from "./merge-agent-tool-inspect"

export function useAgentToolsInspect(tools: AgentToolPublic[], preferId?: string) {
  const targets = orderInspectTargets(tools.filter(shouldInspect), preferId)
  const key = `${preferId ?? ""}|${targets.map((item) => `${item.id}:${item.detectedPath ?? ""}`).join("|")}`
  return useQuery({
    queryKey: ["agentTools.inspect", key],
    enabled: hasIde() && targets.length > 0,
    staleTime: 10_000,
    queryFn: () => inspectToolsSettled(targets)
  })
}

async function inspectToolsSettled(targets: AgentToolPublic[]): Promise<InspectAgentToolResult[]> {
  const [first, ...rest] = targets
  const preferred = first ? await inspectOne(first).catch(() => null) : null
  const others = await Promise.allSettled(rest.map((item) => inspectOne(item)))
  return [...(preferred ? [preferred] : []), ...settledInspectResults(others)]
}

function inspectOne(item: AgentToolPublic): Promise<InspectAgentToolResult> {
  return getIde().agentTools.inspect({ id: item.id, refresh: true }) as Promise<InspectAgentToolResult>
}
