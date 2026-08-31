/**
 * Agent 开跑辅助：凭证解析与 SDK response messages。
 */
import type { ModelMessage } from "ai"
import { harnessPublicStatus } from "./harness-secrets"
import { hasSecret, readSecret, type StoredSecret } from "./secrets"

/** Harness 只查 Claude/Vercel 凭证；本机 ToolLoop 才要求供应商 API key。 */
export async function resolveRunSecret(
  runtime: "local" | "harness",
  harnessId?: string
): Promise<StoredSecret | undefined> {
  if (runtime === "harness") {
    const status = await harnessPublicStatus(harnessId)
    if (!status.ready) {
      throw new Error(status.blockedReason ?? "Harness is not ready for this provider.")
    }
    return readSecret()
  }
  const ready = await hasSecret()
  const secret = await readSecret()
  if (!ready || !secret) {
    throw new Error("Add an API key in Settings before running an agent.")
  }
  return secret
}

export async function readResponseMessages(result: unknown): Promise<ModelMessage[]> {
  const record = result as {
    responseMessages?: ModelMessage[]
    response?: Promise<{ messages?: ModelMessage[] }> | { messages?: ModelMessage[] }
  }
  if (Array.isArray(record.responseMessages) && record.responseMessages.length > 0) {
    return record.responseMessages
  }
  if (!record.response) return []
  const response = await record.response
  if (!response || !Array.isArray(response.messages)) return []
  return response.messages
}
