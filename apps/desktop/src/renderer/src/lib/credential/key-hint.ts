/**
 * 密钥「暂时没法确认」时的细分提示：只在 keyStatusOf === "unverified" 时，按 CredentialCheck 原始 code 区分
 * forbidden（没权限用这个模型）与 billing（余额不足）。徽标 / 顶栏圆点仍走 keyBadgeTone(unverified) 的中性灰，
 * 这里只决定提示文案和按钮，不新增第四态。
 */
import type { ChatReadiness, CredentialCheck } from "@enjoy-agents/ipc-contract/chat-readiness"
import { presetBillingUrl } from "../preset-console-url.ts"
import { endpointIsOfficial } from "../provider-face.ts"
import { keyStatusOf, presetDisplayName, type GuideKeyStatus } from "./key-status.ts"

type CheckLike = Pick<CredentialCheck, "state"> & { code?: CredentialCheck["code"] }

export type KeyHint =
  /** 改密钥 → 打开该供应商编辑页。 */
  | { kind: "forbidden" }
  /** 去充值 → 系统浏览器打开 url；没有 url 只显示文案。 */
  | { kind: "billing"; url?: string }

/** baseURL：档案的端点。指到代理 / 中转（不是这家官方地址）时不给「去充值」链接（那边的额度不在这家控制台充）。 */
export function keyHintOf(
  check: CheckLike | null | undefined,
  presetKind: string | undefined,
  baseURL?: string
): KeyHint | undefined {
  if (!check || keyStatusOf(check) !== "unverified") return undefined
  if (check.code === "forbidden") return { kind: "forbidden" }
  if (check.code === "billing") {
    const url = endpointIsOfficial(presetKind, baseURL) ? presetBillingUrl(presetKind) : undefined
    return url ? { kind: "billing", url } : { kind: "billing" }
  }
  return undefined
}

export type KeyHintProviderRow = { id: string; kind: string; name?: string; baseURL?: string; credentialCheck?: CheckLike }

/**
 * 向导 API 密钥行的提示：和 guideKeyStatus 同一份档案、同一口径
 * （默认路线命中或只有一把时读 readiness.credentialCheck，否则读档案自己的）。
 */
export function guideKeyHint(
  readiness: Pick<ChatReadiness, "apiKeys" | "defaultRoute" | "credentialCheck"> | undefined,
  providers: readonly KeyHintProviderRow[],
  key: GuideKeyStatus | undefined
): { hint: KeyHint; providerName?: string } | undefined {
  if (!key?.profileId || key.status !== "unverified") return undefined
  const keys = readiness?.apiKeys ?? []
  const entry = keys.find((row) => row.providerId === key.profileId)
  const profile = providers.find((row) => row.id === key.profileId)
  const readinessOwns = readiness?.defaultRoute?.profileId === key.profileId || keys.length === 1
  const check = (readinessOwns ? readiness?.credentialCheck : undefined) ?? profile?.credentialCheck
  const kind = entry?.presetId ?? profile?.kind
  const hint = keyHintOf(check, kind, profile?.baseURL)
  if (!hint) return undefined
  return { hint, providerName: key.providerName ?? (kind ? presetDisplayName(kind, profile?.name ?? "") : undefined) }
}
