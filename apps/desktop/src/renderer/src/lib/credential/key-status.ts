/**
 * 密钥三态：已验证（绿）/ 暂时没法确认（中性灰）/ 被拒（红）。
 * 红只给 invalid；没校验过、网络 / 超时 / 403 / 402 都算中性。
 * 向导第 4、7 步与设置页供应商行共用，别各自猜 hasKey。
 */
import type { ChatReadiness, CredentialCheck } from "@enjoy-agents/ipc-contract/chat-readiness"
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"

export type KeyStatus = "ok" | "unverified" | "invalid"

export function keyStatusOf(check: Pick<CredentialCheck, "state"> | undefined): KeyStatus {
  if (check?.state === "ok") return "ok"
  if (check?.state === "invalid") return "invalid"
  return "unverified"
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
 * 向导里「API 密钥」这一行的状态。有一把能用就算能用；全部被拒才是红。
 * 默认路线那把以 readiness.credentialCheck 为准（main 推送最新）；其余读设置快照。
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
  return rows.reduce((best, row) => (RANK[row.status] < RANK[best.status] ? row : best))
}
