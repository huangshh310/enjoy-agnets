/**
 * Agent 开跑辅助：凭证解析与 SDK response messages。
 */
import type { ModelMessage } from "ai"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { sessionOverlayOnEngine } from "@enjoy-agents/ipc-contract"
import { readSessionModels, readSessionRuntimes } from "./agent-tools-vault"
import { listAgentTools } from "./agent-tools-service"
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

/**
 * 会话覆盖 > 入参。非 Enjoy 本地时，覆盖必须在该引擎名单里。
 * modelIds 不传表示名单还没到，先保留；传空数组表示名单已到但不含这个 id。
 */
export function resolveRunModelId(input: {
  sessionId: string
  modelId?: string
  runtimeId?: string
  engineModelIds?: readonly string[]
}): string | undefined {
  const overlay = sessionOverlayOnEngine({
    runtimeId: input.runtimeId,
    sessionModelId: readSessionModels()[input.sessionId],
    modelIds: input.runtimeId && input.runtimeId !== "enjoy-local" ? input.engineModelIds : undefined
  })
  if (overlay) return overlay
  return input.modelId?.trim() || undefined
}

/** 开跑前按引擎名单滤掉上一台留下的模型 id。 */
export async function resolveBoundRunModelId(
  input: { sessionId: string; modelId?: string },
  runtimeId: string
): Promise<string | undefined> {
  const engineModelIds = runtimeId === "enjoy-local" ? undefined : await modelIdsForRuntime(runtimeId)
  return resolveRunModelId({ ...input, runtimeId, engineModelIds })
}

async function modelIdsForRuntime(runtimeId: string): Promise<readonly string[]> {
  const listed = await listAgentTools()
  return listed.find((item) => item.id === runtimeId)?.models.map((item) => item.id) ?? []
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
    throw new Error(MISSING_RUN_SECRET)
  }
  return secret
}

/** 闸已放行但解析密钥时才确定没有 Key。禁止把这句英文 throw 摊进 UI。 */
export const MISSING_RUN_SECRET = "Add an API key in Settings before running an agent."

export function isMissingRunSecretError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Add an API key in Settings")
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
