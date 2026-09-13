/**
 * CLI 覆盖：enabled / 路径 / 额外参数 / 供应商引用。不存 login token。
 */
import { isAbsolute } from "node:path"
import { z } from "zod"
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

const OVERRIDE_SCHEMA = z.object({
  enabled: z.boolean().optional(),
  binaryPath: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  modelId: z.string().optional(),
  providerId: z.string().optional(),
  useCustomProvider: z.boolean().optional()
})

export function readAgentToolOverrides(): Record<string, AgentToolOverride> {
  const raw = getSetting(KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    // 逐条校验：单个坏条目丢弃，不报废整份覆盖。
    const out: Record<string, AgentToolOverride> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const row = OVERRIDE_SCHEMA.safeParse(value)
      if (row.success) out[id] = row.data
    }
    return out
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
  all[sessionId] = runtimeId
  setSetting("session.runtimes", JSON.stringify(all))
  if (modelId?.trim()) writeSessionModel(sessionId, modelId.trim())
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
