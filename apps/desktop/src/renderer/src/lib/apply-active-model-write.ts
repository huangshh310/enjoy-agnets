/**
 * 设默认模型：认 {ok:false} 回包，禁止把失败体当成 SettingsSnapshot。
 */
import { SettingsSnapshot } from "@enjoy-agents/ipc-contract"
import { applySettingsSnapshot } from "../hooks/use-agent-session.ts"
import { getIde } from "./ide.ts"
import { runSecretWrite, type SecretWriteErrorCode } from "./secret-write.ts"

export async function applyActiveModelWrite(input: {
  providerId?: string
  modelId: string
}): Promise<{ ok: true } | { ok: false; code: SecretWriteErrorCode }> {
  const outcome = await runSecretWrite(() => getIde().settings.setActiveModel(input))
  if (!outcome.ok) return outcome
  const snap = SettingsSnapshot.safeParse(outcome.value)
  if (snap.success) {
    await applySettingsSnapshot(snap.data)
    return { ok: true }
  }
  await getIde().settings.setDefaultModel({ modelId: input.modelId })
  return { ok: true }
}
