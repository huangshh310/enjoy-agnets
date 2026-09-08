/**
 * 账号 / 额度 / 动态模型：只对已找到的登录型 CLI 跑官方命令，结果缓存 10s。
 */
import { isCustomAgentId, type AgentToolId, type InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { AGENT_TOOL_PRESETS, catalogFor, probeBinaries } from "@enjoy-agents/agent-harness"
import { safeCustomBinaryPath } from "../agent-tools-guard"
import { readAgentToolOverrides } from "../agent-tools-vault"
import { agentToolsCwd } from "./cwd"
import {
  probeAntigravity,
  probeClaude,
  probeCodex,
  probeCursor,
  probeGrok,
  probeOmp,
  probeOpenCode,
  probePi
} from "./probes"

const CACHE_MS = 10_000
const cache = new Map<AgentToolId, { at: number; value: InspectAgentToolResult }>()

export function invalidateAccountCache(id?: AgentToolId) {
  if (id) cache.delete(id)
  else cache.clear()
}

export async function inspectAgentTool(
  id: AgentToolId,
  refresh = false
): Promise<InspectAgentToolResult> {
  const hit = cache.get(id)
  if (!refresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value
  const value = await inspectFresh(id)
  cache.set(id, { at: Date.now(), value })
  return value
}

export async function inspectReadyTools(ids: AgentToolId[]): Promise<InspectAgentToolResult[]> {
  return Promise.all(ids.map((id) => inspectAgentTool(id)))
}

async function inspectFresh(id: AgentToolId): Promise<InspectAgentToolResult> {
  if (isCustomAgentId(id)) return emptyInspect(id)
  const command = await resolveInspectCommand(id)
  if (!command) return emptyInspect(id)
  const cwd = await agentToolsCwd()
  if (id === "cursor") return { id, ...(await probeCursor(command, cwd)) }
  if (id === "claude") return { id, ...(await probeClaude(command, cwd)) }
  if (id === "codex") return { id, ...(await probeCodex(command, cwd)) }
  if (id === "grok") return { id, ...(await probeGrok(command, cwd)) }
  if (id === "antigravity") return { id, ...(await probeAntigravity(command, cwd)) }
  if (id === "opencode") return { id, ...(await probeOpenCode(command, cwd)) }
  if (id === "pi") return { id, ...(await probePi(command, cwd)) }
  if (id === "omp") return { id, ...(await probeOmp(command, cwd)) }
  return emptyInspect(id)
}

async function resolveInspectCommand(id: AgentToolId): Promise<string | undefined> {
  const preset = AGENT_TOOL_PRESETS.find((item) => item.id === id)
  if (!preset || preset.skillOnly || !preset.binaries.length) return undefined
  const custom = safeCustomBinaryPath(id, readAgentToolOverrides()[id]?.binaryPath)
  const names = custom ? [custom] : [...preset.binaries]
  const probe = await probeBinaries(names, [])
  return probe.path ?? undefined
}

function emptyInspect(id: AgentToolId): InspectAgentToolResult {
  return { id, models: [...(catalogFor(id)?.models ?? [])] }
}
