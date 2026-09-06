/**
 * CLI 覆盖：只存 enabled / 绝对路径 / 额外参数，不存 login token。
 */
import { isAbsolute } from "node:path"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { assertSafeAgentCommand } from "./agent-tools-guard"
import { getSetting, setSetting } from "./database"

const KEY = "agentTools.overrides"

export type AgentToolOverride = {
  enabled?: boolean
  binaryPath?: string
  extraArgs?: string[]
  modelId?: string
  providerId?: string
  useCustomProvider?: boolean
}
export function readAgentToolOverrides(): Record<string, AgentToolOverride> {
  const raw = getSetting(KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, AgentToolOverride>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function writeAgentToolOverride(
  id: AgentToolId,
  patch: AgentToolOverride
): AgentToolOverride {
  const all = readAgentToolOverrides()
  const next: AgentToolOverride = { ...all[id], ...patch }
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
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function writeSessionRuntime(sessionId: string, runtimeId: string) {
  const all = readSessionRuntimes()
  all[sessionId] = runtimeId
  setSetting("session.runtimes", JSON.stringify(all))
}
