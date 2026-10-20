/**
 * 失败卡（连不上 / 密钥没通过 / 拒绝 / 额度）和排队暂停行里「{name}」该说谁（luna P2 定稿）：
 * 1. 已知预设 → 品牌名（OpenAI / DeepSeek…），和设置页供应商行、计费卡 {服务商} 同源；
 * 2. 用户自定义端点（或未知预设）→ 端点**主机名**：不带协议、端口、路径、查询、账号；超过 30 字截断加「…」；
 * 3. 都没有（URL 解析不了 / 没 kind 没地址）→ 通用说法「模型服务」/ "the model service"（句首大写）。
 * 任何情况都不出现密钥档案名、预设 id、完整 URL。ACP / CLI 引擎说引擎名（send-failure-provider-name）。
 */
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"

/** 主机名最多显示的字数（含末尾「…」）。 */
export const ENDPOINT_HOST_MAX = 30

export type ProviderFace = { kind: "named"; name: string } | { kind: "generic" }

/** 端点地址 → 主机名；解析不了 / 不是 http(s) / 没主机名 → undefined。 */
export function endpointHostLabel(baseURL: string | null | undefined, max = ENDPOINT_HOST_MAX): string | undefined {
  const raw = baseURL?.trim()
  if (!raw) return undefined
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return undefined
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (!host) return undefined
  return host.length > max ? `${host.slice(0, max - 1)}…` : host
}

/** 已知预设的品牌名；custom / 未知 / 缺省 → undefined（不回落预设 id）。 */
export function presetBrand(kind: string | null | undefined): string | undefined {
  if (!kind || kind === "custom") return undefined
  return PROVIDER_PRESETS.find((preset) => preset.kind === kind)?.name?.trim() || undefined
}

export function providerFace(row: { kind?: string; baseURL?: string } | undefined): ProviderFace {
  const name = presetBrand(row?.kind) ?? endpointHostLabel(row?.baseURL)
  return name ? { kind: "named", name } : { kind: "generic" }
}

type T = (key: string, vars?: Record<string, string | number>) => string

/**
 * 把 face 填进文案。通用说法按位置挑：句首用 credentialProviderGenericStart（"The model service"），
 * 句中用 credentialProviderGeneric（"the model service"）；中文两者都是「模型服务」。
 */
export function fillProviderFace(
  t: T,
  key: string,
  face: ProviderFace,
  options: { varName?: string; vars?: Record<string, string | number> } = {}
): string {
  const varName = options.varName ?? "name"
  if (face.kind === "named") return t(key, { ...options.vars, [varName]: face.name })
  const generic = t("chat.credentialProviderGeneric")
  const text = t(key, { ...options.vars, [varName]: generic })
  return text.startsWith(generic) ? t("chat.credentialProviderGenericStart") + text.slice(generic.length) : text
}
