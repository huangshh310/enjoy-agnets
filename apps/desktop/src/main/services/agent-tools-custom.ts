/**
 * 用户自定义 stdio ACP：入库、校验 cwd、投影到 AgentToolPublic。
 */
import { existsSync, statSync } from "node:fs"
import { isAbsolute } from "node:path"
import {
  assertCustomAllowedCommand,
  nextCustomAgentId,
  probeBinaries
} from "@enjoy-agents/agent-harness"
import {
  capabilitiesFor,
  CustomAgentRecord,
  isCustomAgentId,
  type AgentToolPublic,
  type CustomAgentCwdMode,
  type UpsertCustomAgentInput
} from "@enjoy-agents/ipc-contract"
import { readSessionRuntimes, writeSessionRuntime } from "./agent-tools-vault"
import { getSetting, setSetting } from "./database"
import { readPreferences, writePreferences } from "./preferences"

const KEY = "agentTools.customAgents"
const BLOCKED_ENV = new Set(["NODE_OPTIONS", "ELECTRON_RUN_AS_NODE"])

export function readCustomAgents(): CustomAgentRecord[] {
  const raw = getSetting(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const result = CustomAgentRecord.safeParse(item)
      return result.success ? [result.data] : []
    })
  } catch {
    return []
  }
}

export function writeCustomAgents(rows: CustomAgentRecord[]) {
  setSetting(KEY, JSON.stringify(rows))
}

export function getCustomAgent(id: string): CustomAgentRecord | undefined {
  return readCustomAgents().find((item) => item.id === id)
}

export function upsertCustomAgent(input: UpsertCustomAgentInput): CustomAgentRecord {
  assertCustomAllowedCommand(input.command)
  const cwdMode = input.cwdMode ?? "workspace"
  const cwd = sanitizeCustomCwd(cwdMode, input.cwd)
  const env = sanitizeEnv(input.env)
  const rows = readCustomAgents()
  const existing = input.id ? rows.find((item) => item.id === input.id) : undefined
  const id = existing?.id ?? nextCustomAgentId(input.label, new Set(rows.map((item) => item.id)))
  const next: CustomAgentRecord = {
    id,
    label: input.label.trim(),
    command: input.command.trim(),
    args: input.args ?? [],
    env,
    cwdMode,
    cwd,
    enabled: input.enabled ?? existing?.enabled ?? true,
    modelId: input.modelId ?? existing?.modelId
  }
  const written = existing ? rows.map((item) => (item.id === id ? next : item)) : [...rows, next]
  writeCustomAgents(written)
  return next
}

export function removeCustomAgent(id: string): void {
  if (!isCustomAgentId(id)) throw new Error(`Unknown custom agent '${id}'.`)
  writeCustomAgents(readCustomAgents().filter((item) => item.id !== id))
  unbindSessions(id)
}

export function sanitizeCustomCwd(mode: CustomAgentCwdMode, cwd?: string): string | undefined {
  if (mode !== "custom") return undefined
  const path = cwd?.trim()
  if (!path) throw new Error("Custom working directory is required.")
  if (!isAbsolute(path)) throw new Error("Custom working directory must be absolute.")
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error("Custom working directory does not exist.")
  }
  return path
}

export function resolveCustomCwd(record: CustomAgentRecord, workspaceRoot: string): string {
  if (record.cwdMode !== "custom" || !record.cwd) return workspaceRoot
  return sanitizeCustomCwd("custom", record.cwd) ?? workspaceRoot
}

export async function toPublicCustom(record: CustomAgentRecord): Promise<AgentToolPublic> {
  const probe = await probeBinaries([record.command], [])
  return {
    id: record.id,
    label: record.label,
    transport: "acp-host",
    binaries: [record.command],
    acpArgs: [...record.args],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: record.enabled,
    binaryPath: record.command,
    extraArgs: [...record.args],
    detectedPath: probe.path,
    version: probe.version,
    status: probe.found ? "ready" : "missing",
    models: [],
    selectedModel: record.modelId,
    installKind: "copy",
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    supportedApiStyles: [],
    capabilities: capabilitiesFor(record.id),
    origin: "custom",
    cwdMode: record.cwdMode,
    customCwd: record.cwd,
    envKeys: Object.keys(record.env)
  }
}

function sanitizeEnv(env?: Record<string, string>): Record<string, string> {
  if (!env) return {}
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    const name = key.trim()
    if (!name || BLOCKED_ENV.has(name)) continue
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue
    next[name] = value
  }
  return next
}

function unbindSessions(runtimeId: string) {
  const all = readSessionRuntimes()
  for (const [sessionId, id] of Object.entries(all)) {
    if (id === runtimeId) writeSessionRuntime(sessionId, "enjoy-local")
  }
  if (readPreferences().runtimeId === runtimeId) writePreferences({ runtimeId: "enjoy-local" })
}
