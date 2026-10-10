/**
 * 自定义 ACP 保存：密钥写走结构化码，白名单拒绝仍用人话，不摊英文钥匙串句。
 */
import type { UpsertCustomAgentInput } from "@enjoy-agents/ipc-contract"
import { getIde } from "../../../lib/ide.ts"
import {
  readSecretWrite,
  secretWriteCodeFromThrown,
  unwrapIpcMessage,
  type SecretWriteErrorCode
} from "../../../lib/secret-write.ts"
import { mapCustomAgentFormError } from "./map-custom-agent-error.ts"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export type CustomAgentSubmitResult =
  | { ok: true }
  | { ok: false; writeCode: SecretWriteErrorCode }
  | { ok: false; error: string }

export async function submitCustomAgentWrite(
  input: UpsertCustomAgentInput,
  t: Translate,
  command: string
): Promise<CustomAgentSubmitResult> {
  try {
    const outcome = readSecretWrite(await getIde().agentTools.upsertCustom(input))
    if (!outcome.ok) return { ok: false, writeCode: outcome.code }
    return { ok: true }
  } catch (error) {
    const code = secretWriteCodeFromThrown(error)
    if (code === "KEYCHAIN_UNAVAILABLE") return { ok: false, writeCode: code }
    return { ok: false, error: mapCustomAgentFormError(unwrapIpcMessage(error), t, command) }
  }
}
