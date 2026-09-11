/**
 * 已就绪 CLI 的账号 / 额度。默认走 main 五分钟缓存，禁止 refresh:true。
 * 全部并行，一家失败不影响其余。
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { AgentToolPublic, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "../lib/ide"
import { rememberedAgentTools } from "./agent-tools-cache"
import { settledInspectResults, shouldInspect } from "./merge-agent-tool-inspect"

export function useAgentToolsInspect(tools: AgentToolPublic[], _preferId?: string) {
  const targets = tools.filter(shouldInspect)
  const key = targets.map((item) => `${item.id}:${item.detectedPath ?? ""}`).join("|")
  return useQuery({
    queryKey: ["agentTools.inspect", key],
    enabled: hasIde() && targets.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    initialData: () => rememberedAsInspect(targets),
    initialDataUpdatedAt: 0,
    queryFn: () => inspectToolsSettled(targets)
  })
}

async function inspectToolsSettled(targets: AgentToolPublic[]): Promise<InspectAgentToolResult[]> {
  const results = await Promise.allSettled(targets.map((item) => inspectOne(item)))
  return settledInspectResults(results)
}

function inspectOne(item: AgentToolPublic): Promise<InspectAgentToolResult> {
  return getIde().agentTools.inspect({ id: item.id, refresh: false }) as Promise<InspectAgentToolResult>
}

function rememberedAsInspect(targets: AgentToolPublic[]): InspectAgentToolResult[] | undefined {
  const remembered = rememberedAgentTools()
  if (remembered.length === 0) return undefined
  const byId = new Map(remembered.map((item) => [item.id, item]))
  const rows = targets.flatMap((item) => {
    const hit = byId.get(item.id)
    if (!hit?.quotaInfo && !hit?.authAccount) return []
    return [
      {
        id: item.id,
        models: hit.models,
        providers: hit.providers,
        authAccount: hit.authAccount,
        quotaInfo: hit.quotaInfo
      } satisfies InspectAgentToolResult
    ]
  })
  return rows.length > 0 ? rows : undefined
}
