/**
 * 已就绪的登录型 CLI：异步补账号 / 额度 / 账号侧模型表。
 */
import { useQuery } from "@tanstack/react-query"
import type { AgentToolPublic, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { shouldInspect } from "./merge-agent-tool-inspect"

export function useAgentToolsInspect(tools: AgentToolPublic[]) {
  const targets = tools.filter(shouldInspect)
  const key = targets.map((item) => `${item.id}:${item.detectedPath ?? ""}`).join("|")
  return useQuery({
    queryKey: ["agentTools.inspect", key],
    enabled: hasIde() && targets.length > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const rows = await Promise.all(
        targets.map(
          (item) => getIde().agentTools.inspect({ id: item.id, refresh: true }) as Promise<InspectAgentToolResult>
        )
      )
      return rows
    }
  })
}
