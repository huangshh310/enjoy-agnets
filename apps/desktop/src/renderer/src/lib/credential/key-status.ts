/**
 * 密钥三态：已验证（绿）/ 暂时没法确认（中性灰）/ 被拒（红）。
 * 红只给 invalid；没校验过、网络 / 超时 / 403 / 402 都算中性。
 * 向导第 4、7 步与设置页供应商行共用，别各自猜 hasKey。
 */
import type { ChatReadiness, CredentialCheck } from "@enjoy-agents/ipc-contract/chat-readiness"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"

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

export type KeyProviderRow = {
  id: string
  kind: string
  name?: string
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
 *    且不绑定任何档案 / 显示名（被拒时「改密钥」走新建，不打开错的档案）。
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
      providerName: presetDisplayName(key.presetId, profile?.name ?? key.presetId)
    }
  }
  if (routeProfile) {
    const routed = keys.find((key) => key.providerId === routeProfile)
    if (routed) return describe(routed, readiness?.credentialCheck)
    return { status: keyStatusOf(readiness?.credentialCheck) }
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
