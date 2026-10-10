/**
 * 写密钥成功后后台跑一次校验：不挡对话框，不重试，写完推 readiness。
 * 落盘带指纹；旧世代回包对不上当前档案则丢掉。
 */
import { parseCredentialCheck, type CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { pushChatReadinessNow } from "./chat-readiness"
import { runCredentialCheck } from "./credential-check-run.ts"
import { credentialFingerprint } from "./credential-fingerprint.ts"
import { clearCredentialCheck, writeCredentialCheck, writeCredentialCheckIfCurrent } from "./credential-check-store.ts"
import { findProfileById } from "./secrets.ts"

export function scheduleCredentialCheck(id: string): void {
  void stampPendingAndRun(id).catch(() => undefined)
}

export async function recheckProviderCredential(id: string): Promise<CredentialCheck> {
  const check = await runAndPersist(id)
  await pushChatReadinessNow().catch(() => undefined)
  return check
}

export { clearCredentialCheck }

async function stampPendingAndRun(id: string): Promise<void> {
  const profile = await findProfileById(id)
  const fp = profile ? credentialFingerprint(profile) : undefined
  writeCredentialCheck(id, parseCredentialCheck({ state: "unverified" }), fp)
  await runAndPersist(id, fp)
}

async function runAndPersist(id: string, startedFp?: string): Promise<CredentialCheck> {
  const profile = await findProfileById(id)
  if (!profile) return writeCredentialCheck(id, { state: "unverified", code: "unknown" })
  const fp = startedFp ?? credentialFingerprint(profile)
  if (credentialFingerprint(profile) !== fp) {
    return { state: "unverified" }
  }
  const check = await runCredentialCheck(profile)
  const latest = await findProfileById(id)
  const written = latest
    ? writeCredentialCheckIfCurrent(id, check, fp, credentialFingerprint(latest))
    : undefined
  await pushChatReadinessNow().catch(() => undefined)
  return written ?? { state: "unverified" }
}
