/**
 * Enjoy 供应商档案与本机 CLI 的协议兼容、引用派生。
 * 不按 kind===custom 通配，避免 OpenAI 中转误绑 Claude。
 */
import { capabilitiesFor } from "./runtime-capabilities.ts"

export type ProviderBindHint = {
  apiStyle?: string
  kind?: string
  hasKey?: boolean
}

export type AgentBindRef = {
  id: string
  label: string
}

/** 该 runtime 能否用这份档案（协议）。不看有没有 Key。 */
export function providersCompatibleWith(runtimeId: string, provider: ProviderBindHint): boolean {
  const bind = capabilitiesFor(runtimeId).providerBind
  if (bind === "none") return false
  const style = provider.apiStyle?.trim() ?? ""
  const kind = provider.kind?.trim() ?? ""
  if (bind === "anthropic") return style === "anthropic" || kind === "anthropic"
  if (bind === "openai") return isOpenAiCompat(style, kind)
  if (bind === "deepseek") return kind === "deepseek"
  if (bind === "google") return kind === "google"
  if (bind === "opencode") {
    return isOpenAiCompat(style, kind) || style === "anthropic" || kind === "anthropic" || kind === "google"
  }
  return false
}

/** 空态给人看的协议名，不是内部 enum。 */
export function protocolNameForBind(runtimeId: string): string {
  const bind = capabilitiesFor(runtimeId).providerBind
  if (bind === "anthropic") return "Anthropic"
  if (bind === "openai") return "OpenAI"
  if (bind === "google") return "Gemini"
  if (bind === "deepseek") return "DeepSeek"
  if (bind === "opencode") return "OpenAI / Anthropic / Gemini"
  return ""
}

/** 给该 CLI 新建档案时预填的 preset；不要丢去供应商整页让用户猜。 */
export function createTargetForBind(runtimeId: string): { kind: string; apiStyle: string } | null {
  const bind = capabilitiesFor(runtimeId).providerBind
  if (bind === "anthropic") return { kind: "anthropic", apiStyle: "anthropic" }
  if (bind === "openai") return { kind: "openai", apiStyle: "openai-responses" }
  if (bind === "google") return { kind: "google", apiStyle: "openai" }
  if (bind === "deepseek") return { kind: "deepseek", apiStyle: "openai" }
  if (bind === "opencode") return { kind: "openai", apiStyle: "openai" }
  return null
}

/** 能否把档案写进该 CLI 家目录配置（DeepSeek 没有稳定文件格式）。 */
export function providerBindCanSyncHome(runtimeId: string): boolean {
  const bind = capabilitiesFor(runtimeId).providerBind
  return bind === "anthropic" || bind === "openai" || bind === "google" || bind === "opencode"
}

export function providersSelectableFor<
  T extends ProviderBindHint & { id: string; hasKey?: boolean; requiresKey?: boolean }
>(runtimeId: string, providers: ReadonlyArray<T>): T[] {
  return providers.filter((item) => {
    if (!providersCompatibleWith(runtimeId, item)) return false
    if (item.requiresKey === false) return true
    return item.hasKey !== false
  })
}

/** 哪些 CLI 正在用这份档案（已打开自定义动力源）。 */
export function agentRefsForProvider(
  providerId: string,
  tools: ReadonlyArray<{
    id: string
    label: string
    providerId?: string
    useCustomProvider?: boolean
  }>
): AgentBindRef[] {
  if (!providerId) return []
  return tools
    .filter((tool) => tool.useCustomProvider === true && tool.providerId === providerId)
    .map((tool) => ({ id: tool.id, label: tool.label }))
}

export type ProviderBindGroupId = "anthropic" | "openai" | "google" | "deepseek" | "other"

const BIND_GROUP_ORDER: ProviderBindGroupId[] = ["anthropic", "openai", "google", "deepseek", "other"]

/** 下拉分组用；人多了按协议，不按 CLI。 */
export function providerBindGroupOf(provider: ProviderBindHint): ProviderBindGroupId {
  const style = provider.apiStyle?.trim() ?? ""
  const kind = provider.kind?.trim() ?? ""
  if (style === "anthropic" || kind === "anthropic") return "anthropic"
  if (kind === "google") return "google"
  if (kind === "deepseek") return "deepseek"
  if (style === "openai" || style === "openai-responses" || kind === "openai") return "openai"
  return "other"
}

export function groupProvidersForBind<T extends ProviderBindHint & { id: string }>(
  providers: readonly T[]
): Array<{ group: ProviderBindGroupId; items: T[] }> {
  const buckets = new Map<ProviderBindGroupId, T[]>()
  for (const item of providers) {
    const group = providerBindGroupOf(item)
    const list = buckets.get(group) ?? []
    list.push(item)
    buckets.set(group, list)
  }
  return BIND_GROUP_ORDER.flatMap((group) => {
    const items = buckets.get(group)
    return items?.length ? [{ group, items }] : []
  })
}

function isOpenAiCompat(style: string, kind: string): boolean {
  if (kind === "google" || kind === "anthropic" || kind === "deepseek") return false
  return style === "openai" || style === "openai-responses" || kind === "openai"
}

/**
 * 绑了 Enjoy 档案：只展示该档案的 models[]。
 * 禁止把 CLI 静态目录或 inspect 官方表混进去。
 */
export function composeBoundAgentModels(
  vaultModels: ReadonlyArray<{ id: string; label?: string }> | undefined
): Array<{ id: string; label: string }> {
  return (vaultModels ?? [])
    .filter((item) => item.id.trim())
    .map((item) => ({ id: item.id, label: item.label?.trim() || item.id }))
}

/** 未绑定时用 CLI 目录；绑定时只用 vault。 */
export function composeAgentModels(input: {
  catalog: ReadonlyArray<{ id: string; label: string }>
  bound: boolean
  vaultModels?: ReadonlyArray<{ id: string; label?: string }>
}): Array<{ id: string; label: string }> {
  if (input.bound) return composeBoundAgentModels(input.vaultModels)
  return input.catalog.map((item) => ({ id: item.id, label: item.label }))
}

type BoundModelSource = {
  useCustomProvider?: boolean
  providerId?: string
  models: ReadonlyArray<{ id: string; label: string }>
}

type BoundProfile = {
  id: string
  models?: ReadonlyArray<{ id: string; label?: string }>
}

/**
 * Composer / inspect 合并用：绑了档案就只信 vault，即使 tool.models 已经混进了官方表。
 */
/** 绑定后所选模型必须落在档案目录里，禁止沿用 CLI 官方 id。 */
export function pickBoundModelId(
  requested: string | undefined,
  vaultModels: ReadonlyArray<{ id: string }>
): string | undefined {
  const id = requested?.trim()
  if (id && vaultModels.some((item) => item.id === id)) return id
  return vaultModels[0]?.id
}

export function resolveBoundAgentModels(
  tool: BoundModelSource,
  profiles?: ReadonlyArray<BoundProfile>
): Array<{ id: string; label: string }> {
  if (!tool.useCustomProvider) return tool.models.map((item) => ({ id: item.id, label: item.label }))
  const profile = tool.providerId
    ? profiles?.find((item) => item.id === tool.providerId)
    : undefined
  if (profile) return composeBoundAgentModels(profile.models)
  if (profiles) return []
  return composeBoundAgentModels(tool.models)
}
