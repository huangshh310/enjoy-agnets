/**
 * 当前默认路线的供应商。快照 profileId 对不上列表时，只落到正在用（active）且有钥、未停用的档案。
 * 原来的 defaultProviderLabel（返回密钥档案名）已删：失败卡不许出现档案名（luna P2 定稿）。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { presetDisplayName } from "./credential/key-status.ts"

export type ListedProvider = {
  id: string
  name?: string
  /** 预设 kind（openai / deepseek / custom…）：供应商品牌名从这里来。 */
  kind?: string
  active?: boolean
  hasKey?: boolean
  enabled?: boolean
}

/**
 * 当前默认路线的**供应商品牌名**（OpenAI / DeepSeek…），按档案的预设 kind 取，和设置页供应商行、
 * 向导「密钥被 {name} 拒绝」同源（presetDisplayName）。
 * luna P2（定稿）：失败卡只说供应商 / 引擎名，**不出现密钥档案名**（「Work key A」「E2E Stub Key」），括号里也不要。
 * 自定义端点（custom）没有品牌名，用 fallback（「当前供应商」），同样不拿档案名顶。
 */
export function defaultProviderBrand(
  readiness: ChatReadiness | undefined,
  providers: readonly ListedProvider[],
  fallback: string
): string {
  const id = resolveDefaultProviderId(readiness, providers)
  const kind = id ? providers.find((row) => row.id === id)?.kind : undefined
  // 自定义端点 / 未知预设 / 没有 kind 都回落成通用说法，绝不拿档案名顶。
  return presetDisplayName(kind, fallback) || fallback
}

export function defaultProviderId(readiness: ChatReadiness | undefined): string | undefined {
  return readiness?.defaultRoute?.profileId ?? readiness?.apiKeys[0]?.providerId
}

/**
 * 快照 id 在列表里就用；否则只认「当前使用中（active）+ 有钥 + 未停用」的档案（夹具 id 对不上 prv_*）。
 * leo BLOCK（#136 r3）：不再回落「任意有钥档案」或列表里不存在的快照 id——会打开错的 / 不存在的档案。
 * 解析不出返回 undefined，调用方（goFixKey）改开「添加 API 密钥」。
 */
export function resolveDefaultProviderId(
  readiness: ChatReadiness | undefined,
  providers: readonly ListedProvider[]
): string | undefined {
  const snap = defaultProviderId(readiness)
  if (snap && providers.some((row) => row.id === snap)) return snap
  const activeKeyed = providers.find((row) => row.active && row.hasKey && row.enabled !== false)
  return activeKeyed?.id
}
