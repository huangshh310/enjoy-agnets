/**
 * CLI 覆盖：enabled / 路径 / 额外参数 / 供应商引用。不存 login token。
 */
import { isAbsolute } from "node:path"
import { z } from "zod"
import { AGENT_TOOL_OVERRIDES_KEY, readAgentToolOverrides } from "./agent-tools-overrides-read"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { assertSafeAgentCommand } from "./agent-tools-guard"
import {
  mergeAgentToolOverride,
  type AgentToolOverride
} from "./agent-tools-override-merge"
import { unbindProviderInOverrides } from "./agent-tools-unbind"
import { getSetting, setSetting } from "./database"
import { clearAcpSessionBind } from "./acp-session-bind.ts"

export { unbindProviderInOverrides } from "./agent-tools-unbind"
export { mergeAgentToolOverride, type AgentToolOverride } from "./agent-tools-override-merge"
export { readAgentToolOverrides } from "./agent-tools-overrides-read"

const KEY = AGENT_TOOL_OVERRIDES_KEY

export function writeAgentToolOverride(
  id: AgentToolId,
  patch: AgentToolOverride
): AgentToolOverride {
  const all = readAgentToolOverrides()
  const next = mergeAgentToolOverride(all[id], patch)
  if (next.binaryPath !== undefined) {
    const path = next.binaryPath.trim()
    if (path) {
      if (!isAbsolute(path)) throw new Error("Custom CLI path must be absolute.")
      assertSafeAgentCommand(id, path)
    }
    next.binaryPath = path || undefined
  }
  all[id] = next
  setSetting(KEY, JSON.stringify(all))
  return next
}

export function readSessionRuntimes(): Record<string, string> {
  const raw = getSetting("session.runtimes")
  if (!raw) return {}
  try {
    const parsed = z
      .record(z.string(), z.string())
      .safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

/** 删除供应商档案时解绑引用它的 CLI。 */
export function unbindProviderFromAgentTools(providerId: string): void {
  const { next, changed } = unbindProviderInOverrides(readAgentToolOverrides(), providerId)
  if (changed) setSetting(KEY, JSON.stringify(next))
}

export function writeSessionRuntime(sessionId: string, runtimeId: string, modelId?: string) {
  const all = readSessionRuntimes()
  const previous = all[sessionId]
  all[sessionId] = runtimeId
  setSetting("session.runtimes", JSON.stringify(all))
  if (modelId?.trim()) writeSessionModel(sessionId, modelId.trim())
  if (previous && previous !== runtimeId) clearAcpSessionBind(sessionId)
}

export function readSessionModels(): Record<string, string> {
  const raw = getSetting("session.models")
  if (!raw) return {}
  try {
    const parsed = z.record(z.string(), z.string()).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function writeSessionModel(sessionId: string, modelId: string) {
  const all = readSessionModels()
  all[sessionId] = modelId
  setSetting("session.models", JSON.stringify(all))
}
