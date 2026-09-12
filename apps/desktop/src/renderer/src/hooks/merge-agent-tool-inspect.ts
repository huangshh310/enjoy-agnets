/**
 * 把 inspect 结果并进 PATH 列表：账号、额度、账号侧模型。
 * 绑了 Enjoy 档案时模型表只信 vault，不把 CLI 官方目录混进 Composer。
 */
import type { AgentToolPublic, InspectAgentToolResult, ProviderPublic } from "@enjoy-agents/ipc-contract"
import { resolveBoundAgentModels } from "@enjoy-agents/ipc-contract/provider-agent-bind"
import { capabilitiesOf } from "@enjoy-agents/ipc-contract/runtime-capabilities"

export function shouldInspect(tool: AgentToolPublic): boolean {
  if (tool.status !== "ready") return false
  const cap = capabilitiesOf(tool)
  if (cap.login || cap.quota || cap.models === "inspect") return true
  return Boolean(tool.requiredVersion)
}

export function applyInspect(
  tools: AgentToolPublic[],
  results: InspectAgentToolResult[] | undefined,
  profiles?: ReadonlyArray<Pick<ProviderPublic, "id" | "models">>
): AgentToolPublic[] {
  const byId = new Map((results ?? []).map((item) => [item.id, item]))
  return tools.map((tool) => projectTool(tool, byId.get(tool.id), profiles))
}

function projectTool(
  tool: AgentToolPublic,
  hit: InspectAgentToolResult | undefined,
  profiles?: ReadonlyArray<Pick<ProviderPublic, "id" | "models">>
): AgentToolPublic {
  const bound = tool.useCustomProvider === true
  if (!hit && !bound) return tool
  const models = bound
    ? resolveBoundAgentModels(tool, profiles)
    : mergeModels(hit?.models ?? [], tool.models)
  return {
    ...tool,
    models,
    providers: bound ? tool.providers : mergeProviders(hit?.providers, tool.providers),
    selectedModel: pickSelectedModel(tool, models),
    authAccount: hit?.authAccount ?? tool.authAccount,
    quotaInfo: hit?.quotaInfo ?? tool.quotaInfo,
    version: firstVersion(hit?.version, hit?.authAccount?.cliVersion, tool.version)
  }
}

function pickSelectedModel(
  tool: AgentToolPublic,
  models: AgentToolPublic["models"]
): string | undefined {
  if (tool.selectedModel && models.some((item) => item.id === tool.selectedModel)) {
    return tool.selectedModel
  }
  return models[0]?.id ?? tool.selectedModel
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

function firstVersion(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const item of candidates) {
    if (item?.trim()) return item.trim()
  }
  return null
}

function mergeModels(
  primary: AgentToolPublic["models"],
  fallback: AgentToolPublic["models"]
): AgentToolPublic["models"] {
  if (!primary.length) return fallback
  const seen = new Set(primary.map((item) => item.id))
  return [...primary, ...fallback.filter((item) => !seen.has(item.id))]
}
