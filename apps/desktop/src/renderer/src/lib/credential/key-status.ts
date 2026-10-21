/**
 * 密钥三态：已验证（绿）/ 暂时没法确认（中性灰）/ 被拒（红）。
 * 红只给 invalid；没校验过、网络 / 超时 / 403 / 402 都算中性。
 * 向导第 4、7 步与设置页供应商行共用，别各自猜 hasKey。
 */
import type { ChatReadiness, CredentialCheck } from "@enjoy-agents/ipc-contract/chat-readiness"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"
import { fillProviderFace, providerFace, type ProviderFace } from "../provider-face.ts"

/** 密钥三态。ok=已验证（绿）；unverified=暂时没法确认（中性灰）；invalid=被供应商拒绝（红）。 */
export type KeyStatus = "ok" | "unverified" | "invalid"

/**
 * 三态判定（唯一真源，其他地方别再自己比 state）。
 * - `state === "ok"` → `"ok"`
 * - `state === "invalid"`（只来自结构化 401 / auth_rejected）→ `"invalid"`
 * - 其余一律 `"unverified"`：没校验过（undefined）、network / timeout / forbidden / billing / unknown。
 * 纯函数，无副作用；入参只读 `state`，可直接传 `CredentialCheck`、`ProviderPublic.credentialCheck`、
 * `ChatReadiness.credentialCheck`。
 */
export function keyStatusOf(check: Pick<CredentialCheck, "state"> | null | undefined): KeyStatus {
  if (check?.state === "ok") return "ok"
  if (check?.state === "invalid") return "invalid"
  return "unverified"
}

/** 徽标色调：红只给 invalid。 */
export type KeyBadgeTone = "success" | "neutral" | "error"

export function keyBadgeTone(status: KeyStatus): KeyBadgeTone {
  if (status === "ok") return "success"
  if (status === "invalid") return "error"
  return "neutral"
}

/** 设置页供应商行：需要密钥且已存密钥才有三态；无需密钥 / 没填密钥返回 undefined（不画三态）。 */
export function profileKeyStatus(profile: {
  hasKey?: boolean
  requiresKey?: boolean
  credentialCheck?: Pick<CredentialCheck, "state">
}): KeyStatus | undefined {
  if (!profile.requiresKey || !profile.hasKey) return undefined
  return keyStatusOf(profile.credentialCheck)
}

/** 预设显示名（openai → OpenAI）。自定义 / 未知预设回落给调用方的名字。 */
export function presetDisplayName(presetId: string | undefined, fallback: string): string {
  if (!presetId || presetId === "custom") return fallback || presetId || ""
  return PROVIDER_PRESETS.find((preset) => preset.kind === presetId)?.name ?? (fallback || presetId)
}

/**
 * 余额 / 密钥提示里说谁：和失败卡**同一条链**（providerFace，luna #164 S1 / 第 3 轮 2、leo rv164e S-b）。
 * - 预设：端点没填或是官方地址 → 品牌；代理 / 中转 → 主机名；解析不了 → 「模型服务」。
 * - 自定义档案（kind 为 custom）：档案名（去空白、≤30 字）→ 主机名 → 「模型服务」。
 * - 未知 kind / 没 kind：主机名 → 「模型服务」。从不说原始 id / 预设 id（不再走 presetDisplayName 的回落）。
 */
export function keyHolderFace(kind: string | undefined, profileName: string, baseURL?: string): ProviderFace {
  return providerFace({ kind, name: profileName, baseURL })
}

/** ProviderFace → 现有 providerName 字段：通用说法给 undefined，调用方用自己的回落词。 */
export function faceName(face: ProviderFace): string | undefined {
  return face.kind === "named" ? face.name : undefined
}

/**
 * 通用说法（没名字可说时）怎么选——以后新加带 {name} 的文案按这条归类（luna #164 第 3 轮 1 细化）：
 * - **引导界面**（完成页摘要、引导标题、第 4 步连接模型）里**说密钥**的句子 →「供应商」/ the provider（句首 The provider）。
 * - 引导界面里**不说密钥**的句子（连不上、额度 / 余额）→「模型服务」/ the model service，和失败卡一致。
 * - **运行时界面**（设置行、失败卡、余额提示、排队行）一律「模型服务」。
 * 引导界面里带称呼的文案都登记在 SETUP_PROVIDER_TEMPLATES，测试逐条钉住；没登记的按「模型服务」。
 */
/**
 * 「供应商」/ The provider：英文只放句首（The provider rejected…）。英文要放句中的说密钥句子不套这个词，
 * 改在 SETUP_GENERIC_SENTENCES 登记一整句不带称呼的通用句（避免 "a different the provider key"）。中文句首句中都是「供应商」。
 */
export const KEY_HOLDER_GENERIC_KEYS = { start: "settings.setupGuide.providerFallback", mid: "settings.setupGuide.providerFallback" } as const
export const SERVICE_GENERIC_KEYS = { start: "chat.credentialProviderGenericStart", mid: "chat.credentialProviderGeneric" } as const

/** 引导界面里带供应商称呼的文案 → 说的是不是密钥（"key" 用「供应商」，"service" 用「模型服务」）。 */
export const SETUP_PROVIDER_TEMPLATES: Readonly<Record<string, "key" | "service">> = {
  "settings.setupGuide.connectApiKeyInvalidHint": "key", // 密钥被 {name} 拒绝了，换一个再试
  "settings.setupGuide.readyKeyInvalidTitle": "key", // 密钥被 {name} 拒绝了
  "settings.setupGuide.readyKeyInvalidHint": "key", // 换一个 {name} 密钥再试，改好就能开始
  "settings.providers.keyBillingHint": "service" // 第 4 步余额提示：{name} 账户余额不足（通用句是 keyBillingHintGeneric）
}

/** 没名字时整句换掉的引导文案（通用句里不出现称呼）。 */
export const SETUP_GENERIC_SENTENCES: Readonly<Record<string, string>> = {
  "settings.setupGuide.readyKeyInvalidHint": "settings.setupGuide.readyKeyInvalidHintGeneric" // Use a different API key… / 换一个供应商密钥再试…
}

/** 这条引导文案没名字时用哪对通用说法。 */
export function setupGenericKeys(key: string): { start: string; mid: string } {
  return Object.hasOwn(SETUP_PROVIDER_TEMPLATES, key) && SETUP_PROVIDER_TEMPLATES[key] === "key" ? KEY_HOLDER_GENERIC_KEYS : SERVICE_GENERIC_KEYS
}

/**
 * 把 providerName 填进引导界面的文案：通用说法按 setupGenericKeys 选，空格走 placeProviderName
 * （「密钥被供应商拒绝了」「密钥被 OpenAI 拒绝了」「密钥被我的网关拒绝了」）。
 */
export function fillSetupProviderText(
  t: Parameters<typeof fillProviderFace>[0],
  key: string,
  providerName: string | undefined,
  vars?: Record<string, string | number>
): string {
  if (!providerName && Object.hasOwn(SETUP_GENERIC_SENTENCES, key)) {
    // 通用句：英文不带称呼；中文仍留 {name} 槽，填「供应商」（词表不直接写「供应商密钥」）
    return fillProviderFace(t, SETUP_GENERIC_SENTENCES[key]!, { kind: "generic" }, { vars, genericKeys: setupGenericKeys(key) })
  }
  const face: ProviderFace = providerName ? { kind: "named", name: providerName } : { kind: "generic" }
  return fillProviderFace(t, key, face, { vars, genericKeys: setupGenericKeys(key) })
}

export type KeyProviderRow = {
  id: string
  kind: string
  name?: string
  /** 档案端点：指到代理时提示说主机名（keyHolderFace）。 */
  baseURL?: string
  credentialCheck?: Pick<CredentialCheck, "state">
}

export type GuideKeyStatus = {
  status: KeyStatus
  /**
   * 该状态对应的档案 id：改密钥直接打开这份。
   * 缺省 = 对不上任何档案（默认路线指向已不存在的档案）：「改密钥」走新建表单，绝不打开别的档案。
   */
  profileId?: string
  /** 显示名：OpenAI，不是 openai。缺省时调用方用通用名「供应商」。 */
  providerName?: string
}

const RANK: Record<KeyStatus, number> = { ok: 0, unverified: 1, invalid: 2 }

/**
 * 向导里「API 密钥」这一行的状态（fail-closed）。
 * 1. 默认路线有 profileId 且在 apiKeys 里：以那份档案为准（读 readiness.credentialCheck），和 ready 口径一致。
 * 2. 默认路线有 profileId 但找不到档案（ghost）：不回落取最好的，只用 keyStatusOf(readiness.credentialCheck)，
 *    其中 ok 降为 unverified（对不上档案不显示绿）；且不绑定任何档案 / 显示名（被拒时「改密钥」走新建）。
 * 3. 默认路线没指档案：取最好的一把；只有一把时 readiness.credentialCheck 就是它的。
 */
export function guideKeyStatus(
  readiness: Pick<ChatReadiness, "apiKeys" | "defaultRoute" | "credentialCheck"> | undefined,
  providers: readonly KeyProviderRow[] = []
): GuideKeyStatus | undefined {
  const keys = readiness?.apiKeys ?? []
  if (keys.length === 0) return undefined
  const routeProfile = readiness?.defaultRoute?.profileId
  const describe = (key: (typeof keys)[number], check: Pick<CredentialCheck, "state"> | undefined) => {
    const profile = providers.find((row) => row.id === key.providerId)
    return {
      status: keyStatusOf(check ?? profile?.credentialCheck),
      profileId: key.providerId,
      providerName: faceName(keyHolderFace(key.presetId, profile?.name ?? "", profile?.baseURL))
    }
  }
  if (routeProfile) {
    const routed = keys.find((key) => key.providerId === routeProfile)
    if (routed) return describe(routed, readiness?.credentialCheck)
    // ghost：对不上档案的 ok 没法确认是哪把，降为中性；invalid 照样红。
    const ghost = keyStatusOf(readiness?.credentialCheck)
    return { status: ghost === "ok" ? "unverified" : ghost }
  }
  const only = keys.length === 1 ? readiness?.credentialCheck : undefined
  const rows = keys.map((key) => describe(key, only))
  return rows.reduce((best, row) => (RANK[row.status] < RANK[best.status] ? row : best))
}

/** 每种色调的文字 / 圆点类名。组件只读这里，不自己写颜色。 */
export const KEY_TONE_CLASS: Record<KeyBadgeTone, { text: string; dot: string }> = {
  success: { text: "text-state-success-text", dot: "bg-state-success-text" },
  neutral: { text: "text-text-tertiary", dot: "bg-text-tertiary" },
  error: { text: "text-text-error-primary", dot: "bg-text-error-primary" }
}

/** 徽标渲染所需的全部取值：组件直接用，data-key-status / 颜色 / 文案键 / 是否带改密钥都从这里来。 */
export type KeyStatusView = {
  status: KeyStatus
  tone: KeyBadgeTone
  textClass: string
  dotClass: string
  labelKey: string
  showFix: boolean
}

export function keyStatusView(status: KeyStatus, labels: Record<KeyStatus, string>): KeyStatusView {
  const tone = keyBadgeTone(status)
  return {
    status,
    tone,
    textClass: KEY_TONE_CLASS[tone].text,
    dotClass: KEY_TONE_CLASS[tone].dot,
    labelKey: labels[status],
    showFix: status === "invalid"
  }
}

const PROVIDER_ROW_LABELS: Record<KeyStatus, string> = {
  ok: "settings.providers.keyVerified",
  unverified: "settings.providers.keyUnverified",
  invalid: "settings.providers.keyInvalid"
}

/** 设置页供应商行的三态视图；无需密钥 / 没填密钥返回 undefined（行里走原来的「无需密钥 / 还没填写密钥」）。 */
export function providerKeyView(profile: Parameters<typeof profileKeyStatus>[0]): KeyStatusView | undefined {
  const status = profileKeyStatus(profile)
  return status ? keyStatusView(status, PROVIDER_ROW_LABELS) : undefined
}

/** readiness 推送前后默认路线的校验变没变（state / code / checkedAt 任一变化）。变了就刷新设置快照。 */
export function credentialCheckChanged(
  prev: Pick<ChatReadiness, "credentialCheck"> | undefined,
  next: Pick<ChatReadiness, "credentialCheck">
): boolean {
  const a = prev?.credentialCheck
  const b = next.credentialCheck
  return a?.state !== b?.state || a?.code !== b?.code || a?.checkedAt !== b?.checkedAt
}

/** 设置页顶部「当前：X」圆点：按当前档案密钥三态（被拒红、没法确认灰）；缺密钥灰；ok / 无需密钥绿。 */
export function activeProviderDotClass(active: Parameters<typeof profileKeyStatus>[0] | undefined): string {
  if (active?.requiresKey && !active.hasKey) return KEY_TONE_CLASS.neutral.dot
  const status = active ? profileKeyStatus(active) : undefined
  return KEY_TONE_CLASS[status ? keyBadgeTone(status) : "success"].dot
}
