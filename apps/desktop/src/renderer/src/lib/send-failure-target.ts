/**
 * luna P2-1：失败卡（连不上 / 密钥没通过 / 拒绝 / 额度）和排队暂停行说谁、「改密钥」开哪份——
 * 跟**这一轮实际走的**引擎 / 档案（send-failure-route 记下的），没记下就跟「这一发会用的」：
 * Enjoy 本地 = 当前档案（与 main getActiveProfile / pickActiveProfile 同一挑法：已启用且是当前，否则第一份已启用）。
 * 不再用 defaultProviderFace（默认路线不是 Enjoy 本地时它退到列表第一份带钥档案，说错名字、开错编辑框）。
 *
 * 称呼规则不变（provider-face：预设品牌只在官方地址；代理说主机名；解析不了说「模型服务」；自定义说档案名）。
 * 「改密钥」：
 * - Enjoy 本地：这份档案不需要密钥（Ollama / LM Studio 等免密钥预设）→ 不给按钮；找得到档案 → 打开它的编辑框；
 *   找不到（被删 / 列表空）→ 打开「添加 API 密钥」。
 * - ACP / CLI 引擎（Amp…）：绑了供应商档案 → 打开那份（免密钥档案不给按钮）；没绑 → 打开这个引擎自己的设置卡。
 */
import { providerFace, type ProviderFace } from "./provider-face.ts"
import { sendFailureProviderName } from "./send-failure-provider-name.ts"

export type FixKeyTarget =
  | { kind: "provider"; providerId: string }
  | { kind: "agent"; toolId: string }
  | { kind: "add" }

export type FailureProviderRow = {
  id: string
  name?: string
  kind?: string
  baseURL?: string
  active?: boolean
  enabled?: boolean
  /** 预设要不要密钥（ProviderPublic.requiresKey）。false = 免密钥，不给「改密钥」。 */
  requiresKey?: boolean
}

export type FailureToolRow = {
  id: string
  label?: string
  useCustomProvider?: boolean
  providerId?: string
}

export type SendFailureTarget = { face: ProviderFace; fixKey: FixKeyTarget | null }

/** 与 main active-profile-pick 同义：已启用且是当前；当前被关了回落第一份已启用。 */
export function runProfileOf<T extends { enabled?: boolean; active?: boolean }>(rows: readonly T[]): T | undefined {
  const enabled = rows.filter((row) => row.enabled !== false)
  return enabled.find((row) => row.active === true) ?? enabled[0]
}

export function sendFailureTarget(input: {
  /** 上一轮失败实际走的（main run.error 带回）。null = 没记下，按「这一发会用的」。 */
  route: { runtimeId: string; providerId?: string } | null
  /** 前台会话的引擎（没记下时用）。 */
  runtimeId: string | null | undefined
  tools: readonly FailureToolRow[]
  displayNames: Readonly<Record<string, string>>
  providers: readonly FailureProviderRow[]
}): SendFailureTarget {
  const runtimeId = input.route?.runtimeId || input.runtimeId || "enjoy-local"
  if (runtimeId === "enjoy-local") {
    const row = input.route?.providerId
      ? input.providers.find((item) => item.id === input.route?.providerId)
      : runProfileOf(input.providers)
    return { face: providerFace(row), fixKey: fixKeyForProfile(row) }
  }
  const face = sendFailureProviderName({
    runtimeId,
    tools: input.tools,
    displayNames: input.displayNames,
    provider: { kind: "generic" }
  })
  const tool = input.tools.find((item) => item.id === runtimeId)
  const boundId = input.route
    ? input.route.providerId
    : tool?.useCustomProvider === true
      ? tool.providerId
      : undefined
  if (!boundId) return { face, fixKey: { kind: "agent", toolId: runtimeId } }
  const bound = input.providers.find((item) => item.id === boundId)
  return { face, fixKey: bound?.requiresKey === false ? null : { kind: "provider", providerId: boundId } }
}

function fixKeyForProfile(row: FailureProviderRow | undefined): FixKeyTarget | null {
  if (!row) return { kind: "add" }
  if (row.requiresKey === false) return null
  return { kind: "provider", providerId: row.id }
}
