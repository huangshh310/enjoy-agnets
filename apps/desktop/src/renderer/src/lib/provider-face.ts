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

/** 中日韩文字（汉字 / 假名 / 谚文，含半角片假名 U+FF65–FF9F）。 */
const CJK_TEXT = /[\u2e80-\u2fff\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\uff65-\uff9f]/u
/**
 * 中日韩标点：CJK 符号区和全角标点（「，」「。」「（」「：」…）。挨着它们中文里不留空格。
 * 全角字母 / 数字（Ａ–Ｚ、ａ–ｚ、０–９）不算标点，按拉丁处理；半角片假名算中日韩文字。
 */
const CJK_PUNCT = /[\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff64\uffe0-\uffee]/u
const LATIN_ALNUM = /[A-Za-z0-9\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/u

type Edge = "cjk" | "cjkPunct" | "west"
/** 称呼边上的字：中文 / 中文标点 / 其它一律算西文（拉丁字母、数字、全角字母数字、「…」「)」「.」都算）。 */
function nameEdge(ch: string | undefined): Edge {
  if (ch == null) return "west"
  if (CJK_TEXT.test(ch)) return "cjk"
  if (CJK_PUNCT.test(ch)) return "cjkPunct"
  return "west"
}

/**
 * 称呼和旁边文案之间要不要空格。neighbor 是文案里紧挨称呼的那个字（跳过一个空格）。
 * - 文案那边是中文标点 → 不留；
 * - 一边中文、一边西文（称呼边上的拉丁 / 数字 / 「…」等，或文案里的拉丁字母 / 数字）→ 留；
 * - 两边都是中文 → 不留；
 * - 文案那边是拉丁字母 / 数字、称呼边上是中文标点（「Claude（工作）is out」「reach 「通义」」）→ 按文案原样，英文从不粘连；
 * - 文案那边是西文标点、行首行尾，或两边都是西文 → 按文案原样（英文文案不动）。
 */
function boundarySpace(edge: Edge, neighbor: string | undefined): "space" | "none" | "keep" {
  if (neighbor == null) return "keep"
  if (CJK_PUNCT.test(neighbor)) return "none"
  if (CJK_TEXT.test(neighbor)) return edge === "west" ? "space" : "none"
  if (LATIN_ALNUM.test(neighbor)) return edge === "cjk" ? "space" : "keep"
  return "keep"
}

/** 占位：先把称呼位置标出来，再按两边的字决定空格。用不会出现在文案里的私用区字符。 */
const SLOT = "\ue000provider\ue000"

/**
 * luna #163（10-21）中文空格规则，前后两边各自判断：只有中文和拉丁字母 / 数字相邻时留一个空格，
 * 挨着中文标点不留。「连不上模型服务，」「连不上通义，」「连不上 api.example.com，」「连不上 OpenAI，」
 * 「OpenAI 额度用完了」「模型服务额度用完了」。截断称呼：末尾「…」算西文（后面留空格），前面看第一个字。
 * 英文文案两边是西文，按原样。失败卡和排队暂停行都经 fillProviderFace 走这里，规则只此一处。
 */
export function placeProviderName(template: string, name: string, slot = SLOT): string {
  const chars = [...name.trim()]
  const head = nameEdge(chars[0])
  const tail = nameEdge(chars.at(-1))
  const parts = template.split(slot)
  for (let i = 0; i < parts.length - 1; i++) {
    // 前一边：parts[i] 的结尾
    const before = parts[i]!
    const bSpaced = before.endsWith(" ")
    const bCore = bSpaced ? before.slice(0, -1) : before
    const bDecision = boundarySpace(head, [...bCore].at(-1))
    if (bDecision !== "keep") parts[i] = bCore + (bDecision === "space" ? " " : "")
    // 后一边：parts[i + 1] 的开头
    const after = parts[i + 1]!
    const aSpaced = after.startsWith(" ")
    const aCore = aSpaced ? after.slice(1) : after
    const aDecision = boundarySpace(tail, [...aCore][0])
    if (aDecision !== "keep") parts[i + 1] = (aDecision === "space" ? " " : "") + aCore
  }
  return parts.join(name.trim())
}

/**
 * 把 face 填进文案。通用说法按位置挑：句首用 credentialProviderGenericStart（"The model service"），
 * 句中用 credentialProviderGeneric（"the model service"）；中文两者都是「模型服务」。
 * 称呼前后两边的空格都按 placeProviderName 的规则各自判断（中文和拉丁字母 / 数字相邻才留，挨中文标点不留，英文按文案原样）。
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
