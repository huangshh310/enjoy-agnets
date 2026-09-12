/**
 * 账号 / 额度 / 动态模型。默认读 5 分钟缓存（含磁盘），refresh 才打官方接口。
 */
import { isCustomAgentId, type AgentToolId, type InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { AGENT_TOOL_PRESETS, catalogFor, probeBinaries } from "@enjoy-agents/agent-harness"
import { safeCustomBinaryPath } from "../agent-tools-guard"
import { readAgentToolOverrides } from "../agent-tools-vault"
import { agentToolsCwd } from "./cwd"
import {
  invalidateInspectCache,
  isInspectFresh,
  readInspectCache,
  writeInspectCache
} from "./inspect-store"
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
import { emptyInspectResult } from "./inspect-empty"
import { getToolSpendStats } from "./tool-spend.ts"

export function invalidateAccountCache(id?: AgentToolId) {
  invalidateInspectCache(id)
}

export async function inspectAgentTool(
  id: AgentToolId,
  refresh = false
): Promise<InspectAgentToolResult> {
  const hit = readInspectCache(id)
  if (!refresh && isInspectFresh(hit) && hit) return hit.value
  if (!refresh && hit) {
    void inspectFresh(id)
      .then((value) => writeInspectCache(id, value))
      .catch(() => undefined)
    return hit.value
  }
  const value = await inspectFresh(id)
  writeInspectCache(id, value)
  return value
}

export async function inspectReadyTools(ids: AgentToolId[]): Promise<InspectAgentToolResult[]> {
  return Promise.all(ids.map((id) => inspectAgentTool(id)))
}

async function inspectFresh(id: AgentToolId): Promise<InspectAgentToolResult> {
  let res: InspectAgentToolResult
  if (isCustomAgentId(id)) {
    res = emptyInspectFor(id)
  } else {
    const command = await resolveInspectCommand(id)
    if (!command) {
      res = emptyInspectFor(id)
    } else {
      const cwd = await agentToolsCwd()
      if (id === "cursor") res = { id, ...(await probeCursor(command, cwd)) }
      else if (id === "claude") res = { id, ...(await probeClaude(command, cwd)) }
      else if (id === "codex") res = { id, ...(await probeCodex(command, cwd)) }
      else if (id === "grok") res = { id, ...(await probeGrok(command, cwd)) }
      else if (id === "antigravity") res = { id, ...(await probeAntigravity(command, cwd)) }
      else if (id === "opencode") res = { id, ...(await probeOpenCode(command, cwd)) }
      else if (id === "pi") res = { id, ...(await probePi(command, cwd)) }
      else if (id === "omp") res = { id, ...(await probeOmp(command, cwd)) }
      else res = emptyInspectFor(id)
    }
  }

  const spend = getToolSpendStats(id)
  if (spend) {
    if (res.quotaInfo) {
      res.quotaInfo.spend = spend
    } else {
      res.quotaInfo = {
        hasQuota: false,
        spend
      }
    }
  }

  return res
}

async function resolveInspectCommand(id: AgentToolId): Promise<string | undefined> {
  const preset = AGENT_TOOL_PRESETS.find((item) => item.id === id)
  if (!preset || preset.skillOnly || !preset.binaries.length) return undefined
  const custom = safeCustomBinaryPath(id, readAgentToolOverrides()[id]?.binaryPath)
  const names = custom ? [custom] : [...preset.binaries]
  const probe = await probeBinaries(names, [])
  return probe.path ?? undefined
}

function emptyInspectFor(id: AgentToolId): InspectAgentToolResult {
  return emptyInspectResult(id, [...(catalogFor(id)?.models ?? [])])
}

