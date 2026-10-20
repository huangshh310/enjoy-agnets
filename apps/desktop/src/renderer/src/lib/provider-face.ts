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

/** 中日韩文字（含全角标点）。省略号「…」（U+2026）不算，截断的主机名按拉丁结尾处理。 */
const CJK = /[\u2e80-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/u

/** 称呼以中日韩文字结尾（「模型服务」「通义」）→ 后面直接接中文不留空格。 */
export function providerNameEndsCjk(name: string): boolean {
  const last = [...name.trimEnd()].at(-1)
  return last != null && CJK.test(last)
}

/** 占位：先把称呼位置标出来，再按称呼结尾决定后面的空格。用不会出现在文案里的私用区字符。 */
const SLOT = "\ue000provider\ue000"

/**
 * luna #163（10-21）中文空格规则：称呼后面紧跟「空格 + 中文」时——
 * 称呼以拉丁字母 / 数字（或「…」）结尾 → 留空格（「OpenAI 额度用完了」「api.example.com 额度用完了」）；
 * 以中文结尾 → 去掉空格（「模型服务额度用完了」「通义额度用完了」）。英文文案后面跟的不是中文，不受影响。
 * 失败卡和排队暂停行都经 fillProviderFace 走这里，规则只此一处。
 */
export function placeProviderName(template: string, name: string, slot = SLOT): string {
  const tight = providerNameEndsCjk(name)
  return template
    .split(slot)
    .map((part, index) => (index > 0 && tight && part.startsWith(" ") && CJK.test([...part][1] ?? "") ? part.slice(1) : part))
    .join(name)
}

/**
 * 把 face 填进文案。通用说法按位置挑：句首用 credentialProviderGenericStart（"The model service"），
 * 句中用 credentialProviderGeneric（"the model service"）；中文两者都是「模型服务」。
 * 称呼后面的空格按 placeProviderName 的中文规则处理。
 */
export function fillProviderFace(
  t: T,
  key: string,
  face: ProviderFace,
  options: { varName?: string; vars?: Record<string, string | number> } = {}
): string {
  const varName = options.varName ?? "name"
  const template = t(key, { ...options.vars, [varName]: SLOT })
  const name =
    face.kind === "named"
      ? face.name
      : template.startsWith(SLOT)
        ? t("chat.credentialProviderGenericStart")
        : t("chat.credentialProviderGeneric")
  return placeProviderName(template, name)
}
