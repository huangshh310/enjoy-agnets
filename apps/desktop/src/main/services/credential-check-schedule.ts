/**
 * 写密钥成功后后台跑一次校验：不挡对话框，不重试，写完推 readiness。
 */
import { parseCredentialCheck, type CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { pushChatReadinessNow } from "./chat-readiness"
import { runCredentialCheck } from "./credential-check-run.ts"
import { clearCredentialCheck, writeCredentialCheck } from "./credential-check-store.ts"
import { findProfileById } from "./secrets.ts"

export function scheduleCredentialCheck(id: string): void {
  writeCredentialCheck(id, parseCredentialCheck({ state: "unverified" }))
  void runAndPersist(id).catch(() => undefined)
}

export async function recheckProviderCredential(id: string): Promise<CredentialCheck> {
  const check = await runAndPersist(id)
  await pushChatReadinessNow().catch(() => undefined)
  return check
}

export { clearCredentialCheck }

async function runAndPersist(id: string): Promise<CredentialCheck> {
  const profile = await findProfileById(id)
  if (!profile) return writeCredentialCheck(id, { state: "unverified", code: "unknown" })
  const check = await runCredentialCheck(profile)
  writeCredentialCheck(id, check)
  await pushChatReadinessNow().catch(() => undefined)
  return check
}
