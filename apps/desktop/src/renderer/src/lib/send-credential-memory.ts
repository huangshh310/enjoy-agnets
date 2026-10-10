/**
 * 本轮 enjoy-local 发送结果的渲染侧记忆。
 * 快照 / 落盘 profileId 对不上档案时，列表仍能跟上首发回写，不被夹具 overlay 盖住。
 */
import { useSyncExternalStore } from "react"
import type { CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import {
  credentialBillingCode,
  credentialForbiddenCode
} from "./credential-check-ui"
import { isCredentialInvalid, isProviderBilling, isProviderForbidden } from "./send-gate-codes"

let remembered: CredentialCheck | undefined
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function rememberedSendCredential(): CredentialCheck | undefined {
  return remembered
}

export function noteSendCredentialOutcome(
  outcome: "ok" | "invalid" | "forbidden" | "billing" | "unchanged"
): void {
  if (outcome === "unchanged") return
  if (outcome === "ok") remembered = { state: "ok" }
  else if (outcome === "invalid") remembered = { state: "invalid", code: "auth_rejected" }
  else if (outcome === "forbidden") {
    remembered = { state: "unverified", code: credentialForbiddenCode() as CredentialCheck["code"] }
  } else {
    remembered = { state: "unverified", code: credentialBillingCode() as CredentialCheck["code"] }
  }
  emit()
}

/** run.end 记 ok；credential_invalid 记 invalid；forbidden/billing 记 unverified；网络不改。 */
export function noteSendCredentialFromStream(
  event: { type: string },
  patch: { error?: string | null },
  runtimeId?: string | null
): void {
  if (event.type === "run.end" && (runtimeId ?? "enjoy-local") === "enjoy-local") {
    noteSendCredentialOutcome("ok")
    return
  }
  if (event.type !== "run.error" || !patch.error) return
  if (isCredentialInvalid(patch.error)) {
    noteSendCredentialOutcome("invalid")
    return
  }
  if (isProviderForbidden(patch.error)) {
    noteSendCredentialOutcome("forbidden")
    return
  }
  if (isProviderBilling(patch.error)) noteSendCredentialOutcome("billing")
}

export function subscribeSendCredential(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useRememberedSendCredential(): CredentialCheck | undefined {
  return useSyncExternalStore(subscribeSendCredential, rememberedSendCredential, rememberedSendCredential)
}

/** 单测复位。 */
export function resetSendCredentialMemory(): void {
  remembered = undefined
}
