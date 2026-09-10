/**
 * CLI 覆盖：enabled / 路径 / 额外参数 / 供应商引用。不存 login token。
 */
import { isAbsolute } from "node:path"
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import { assertSafeAgentCommand } from "./agent-tools-guard"
import {
  mergeAgentToolOverride,
  type AgentToolOverride
} from "./agent-tools-override-merge"
import { unbindProviderInOverrides } from "./agent-tools-unbind"
import { getSetting, setSetting } from "./database"

export { unbindProviderInOverrides } from "./agent-tools-unbind"
export { mergeAgentToolOverride, type AgentToolOverride } from "./agent-tools-override-merge"

const KEY = "agentTools.overrides"

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
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

/** 删除供应商档案时解绑引用它的 CLI。 */
export function unbindProviderFromAgentTools(providerId: string): void {
  const { next, changed } = unbindProviderInOverrides(readAgentToolOverrides(), providerId)
  if (changed) setSetting(KEY, JSON.stringify(next))
}

export function writeSessionRuntime(sessionId: string, runtimeId: string) {
  const all = readSessionRuntimes()
  all[sessionId] = runtimeId
  setSetting("session.runtimes", JSON.stringify(all))
}
