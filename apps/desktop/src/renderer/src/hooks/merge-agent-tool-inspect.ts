/**
 * 把 inspect 结果并进 PATH 列表：账号、额度、账号侧模型。
 */
import type { AgentToolPublic, InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { capabilitiesOf } from "@enjoy-agents/ipc-contract/runtime-capabilities"

export function shouldInspect(tool: AgentToolPublic): boolean {
  if (tool.status !== "ready") return false
  const cap = capabilitiesOf(tool)
  return cap.login || cap.quota || cap.models === "inspect"
}

export function applyInspect(
  tools: AgentToolPublic[],
  results: InspectAgentToolResult[] | undefined
): AgentToolPublic[] {
  if (!results?.length) return tools
  const byId = new Map(results.map((item) => [item.id, item]))
  return tools.map((tool) => {
    const hit = byId.get(tool.id)
    if (!hit) return tool
    const models = mergeModels(hit.models, tool.models)
    const selected =
      tool.selectedModel && models.some((item) => item.id === tool.selectedModel)
        ? tool.selectedModel
        : (models[0]?.id ?? tool.selectedModel)
    return {
      ...tool,
      models,
      providers: mergeProviders(hit.providers, tool.providers),
      selectedModel: selected,
      authAccount: hit.authAccount ?? tool.authAccount,
      quotaInfo: hit.quotaInfo ?? tool.quotaInfo
    }
  })
}

/** 空数组常是 inspect 竞态，不要把已有供应商表冲掉。 */
function mergeProviders(
  incoming: AgentToolPublic["providers"],
  fallback: AgentToolPublic["providers"]
): AgentToolPublic["providers"] {
  if (incoming === undefined) return fallback
  if (incoming.length === 0 && fallback?.length) return fallback
  return incoming
}

/** allSettled 后只收成功项，一家失败不能让整表停在 loggedIn==null。 */
export function settledInspectResults(
  results: PromiseSettledResult<InspectAgentToolResult>[]
): InspectAgentToolResult[] {
  return results.flatMap((item) => (item.status === "fulfilled" ? [item.value] : []))
}

/** 当前引擎先检测，避免 Hermes/OMP 拖死 Claude。 */
export function orderInspectTargets<T extends { id: string }>(targets: T[], preferId?: string): T[] {
  if (!preferId) return [...targets]
  return [...targets].sort((left, right) => Number(right.id === preferId) - Number(left.id === preferId))
}

function mergeModels(
  primary: AgentToolPublic["models"],
  fallback: AgentToolPublic["models"]
): AgentToolPublic["models"] {
  if (!primary.length) return fallback
  const seen = new Set(primary.map((item) => item.id))
  return [...primary, ...fallback.filter((item) => !seen.has(item.id))]
}
