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
      selectedModel: selected,
      authAccount: hit.authAccount,
      quotaInfo: hit.quotaInfo
    }
  })
}

function mergeModels(
  primary: AgentToolPublic["models"],
  fallback: AgentToolPublic["models"]
): AgentToolPublic["models"] {
  if (!primary.length) return fallback
  const seen = new Set(primary.map((item) => item.id))
  return [...primary, ...fallback.filter((item) => !seen.has(item.id))]
}
