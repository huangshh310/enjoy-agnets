/**
 * 密钥校验三态 → 词条。pending = 本地再验中，或还没有 checkedAt 的首次 unverified。
 */
import type { CredentialCheck, CredentialCheckCode } from "@enjoy-agents/ipc-contract/credential-check"

export type CredentialUiState = "none" | "pending" | "ok" | "invalid" | "unverified"

export function credentialUiState(
  check: CredentialCheck | undefined,
  opts?: { pending?: boolean; hasKey?: boolean }
): CredentialUiState {
  if (opts?.pending) return "pending"
  if (!opts?.hasKey && !check) return "none"
  if (!check) return opts?.hasKey ? "pending" : "none"
  if (check.state === "ok") return "ok"
  if (check.state === "invalid") return "invalid"
  if (check.state === "unverified" && !check.checkedAt) return "pending"
  return "unverified"
}

export function credentialStatusLabelKey(state: Exclude<CredentialUiState, "none">): string {
  if (state === "ok") return "settings.setupGuide.connectApiKeyConnected"
  if (state === "invalid") return "settings.setupGuide.credentialInvalid"
  if (state === "pending") return "settings.setupGuide.verifyPending"
  return "settings.setupGuide.credentialUnverified"
}

export function credentialUnverifiedHintKey(code: CredentialCheckCode | undefined): string {
  if (code === "network") return "settings.setupGuide.credentialUnverifiedNetwork"
  if (code === "timeout") return "settings.setupGuide.credentialUnverifiedTimeout"
  return "settings.setupGuide.credentialUnverifiedUnknown"
}

/** 末屏副标题：只认快照 ready + 默认路线校验 unverified，不重算 ready。 */
export function showReadyUnverifiedHint(input: {
  ready?: boolean
  credentialState?: CredentialCheck["state"]
}): boolean {
  return input.ready === true && input.credentialState === "unverified"
}
