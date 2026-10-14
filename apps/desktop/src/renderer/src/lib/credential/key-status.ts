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
  /** 该状态对应的档案 id：改密钥直接打开这份。 */
  profileId: string
  /** 显示名：OpenAI，不是 openai。 */
  providerName: string
}

const RANK: Record<KeyStatus, number> = { ok: 0, unverified: 1, invalid: 2 }

/**
 * 向导里「API 密钥」这一行的状态。
 * 有默认路线档案（defaultRoute.profileId 在 apiKeys 里）：以那份档案为准，和 ready 口径一致
 * （默认那把被拒、另一把 ok 时仍是红，不会绿着又被第 7 步拦回去）。
 * 没有路线档案才取最好的一把。默认那把读 readiness.credentialCheck（main 推送最新），其余读设置快照。
 */
export function guideKeyStatus(
  readiness: Pick<ChatReadiness, "apiKeys" | "defaultRoute" | "credentialCheck"> | undefined,
  providers: readonly KeyProviderRow[] = []
): GuideKeyStatus | undefined {
  const keys = readiness?.apiKeys ?? []
  if (keys.length === 0) return undefined
  const routeProfile = readiness?.defaultRoute?.profileId
  const rows = keys.map((key) => {
    const profile = providers.find((row) => row.id === key.providerId)
    const fromRoute =
      readiness?.credentialCheck && (key.providerId === routeProfile || keys.length === 1)
        ? readiness.credentialCheck
        : undefined
    return {
      status: keyStatusOf(fromRoute ?? profile?.credentialCheck),
      profileId: key.providerId,
      providerName: presetDisplayName(key.presetId, profile?.name ?? key.presetId)
    }
  })
  const routed = routeProfile ? rows.find((row) => row.profileId === routeProfile) : undefined
  if (routed) return routed
  return rows.reduce((best, row) => (RANK[row.status] < RANK[best.status] ? row : best))
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
