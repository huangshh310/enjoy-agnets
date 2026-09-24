/**
 * Agent 开跑辅助：凭证解析与 SDK response messages。
 */
import type { ModelMessage } from "ai"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { readSessionModels, readSessionRuntimes } from "./agent-tools-vault"
import { harnessPublicStatus } from "./harness-secrets"
import type { AppPreferences } from "./preferences"
import { hasSecret, readSecret, type StoredSecret } from "./secrets"

/** 会话覆盖 > 入参 > 偏好 > Enjoy Local。 */
export function resolveRuntimeId(
  input: { runtimeId?: string; sessionId: string },
  prefs: AppPreferences
): string {
  return (
    input.runtimeId ||
    readSessionRuntimes()[input.sessionId] ||
    prefs.runtimeId ||
    "enjoy-local"
  )
}

/** 分叉与心跳都认会话上已绑定的引擎和模型，不另传一份。 */
export function resolveSessionBinding(
  sessionId: string,
  prefs: AppPreferences
): { runtimeId: string; modelId: string | undefined } {
  return {
    runtimeId: resolveRuntimeId({ sessionId }, prefs),
    modelId: resolveRunModelId({ sessionId })
  }
}

/** 会话覆盖 > 入参。同引擎换模下一轮读这里。 */
export function resolveRunModelId(input: { sessionId: string; modelId?: string }): string | undefined {
  const overlay = readSessionModels()[input.sessionId]?.trim()
  if (overlay) return overlay
  return input.modelId?.trim() || undefined
}

/** ACP 不读 Providers Key；Harness 查沙箱就绪；本机 ToolLoop 必须有 API key。 */
export async function resolveRunSecret(
  runtimeId: string,
  codingRuntime: "local" | "harness",
  harnessId?: string
): Promise<StoredSecret | undefined> {
  if (isAcpHostRuntime(runtimeId)) return undefined
  if (codingRuntime === "harness") {
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
