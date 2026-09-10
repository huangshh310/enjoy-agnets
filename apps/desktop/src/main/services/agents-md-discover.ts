/**
 * 从磁盘收集 AGENTS.md 链。路径 jail 在工作区内；全局只读 ~/.enjoy-agents。
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import {
  formatAgentsMdChain,
  instructionDirsForTouch,
  pickAgentsMdCandidate,
  type AgentsMdLayer
} from "@enjoy-agents/ipc-contract/agents-md-chain"
import { resolveInsideWorkspace, toWorkspaceRelative } from "./paths.ts"

export function discoverAgentsMdChain(input: {
  workspaceRoot: string
  cwdRel?: string
  home?: string
}): AgentsMdLayer[] {
  const layers: AgentsMdLayer[] = []
  layers.push(...readGlobalAgentsMd(input.home ?? homedir()))
  const dirs = instructionDirsForTouch(input.cwdRel?.trim() || ".")
  for (const dir of dirs) {
    const layer = readWorkspaceDirLayer(input.workspaceRoot, dir)
    if (layer) layers.push(layer)
  }
  return layers
}

/** 开流 / 检查器共用的链正文；没有文件时为空串。 */
export function formatWorkspaceAgentsMd(
  workspaceRoot: string,
  cwdRel = ".",
  home?: string
): string {
  return formatAgentsMdChain(discoverAgentsMdChain({ workspaceRoot, cwdRel, home }))
}

export function readWorkspaceDirLayer(
  workspaceRoot: string,
  dirRel: string
): AgentsMdLayer | undefined {
  let dirAbs = workspaceRoot
  try {
    dirAbs = dirRel === "." ? workspaceRoot : resolveInsideWorkspace(workspaceRoot, dirRel)
  } catch {
    return undefined
  }
  if (!existsSync(dirAbs)) return undefined
  let names: string[] = []
  try {
    names = readdirSync(dirAbs)
  } catch {
    return undefined
  }
  const picked = pickAgentsMdCandidate(names)
  if (!picked) return undefined
  const abs = join(dirAbs, picked)
  try {
    const content = readFileSync(abs, "utf8")
    if (!content.trim()) return undefined
    const rel = toWorkspaceRelative(workspaceRoot, abs).replace(/\\/g, "/")
    return { relPath: rel || picked, content }
  } catch {
    return undefined
  }
}

function readGlobalAgentsMd(home: string): AgentsMdLayer[] {
  const root = join(home, ".enjoy-agents")
  const names = existsSync(root) ? safeList(root) : []
  const picked = pickAgentsMdCandidate(names)
  if (!picked) return []
  try {
    const content = readFileSync(join(root, picked), "utf8")
    if (!content.trim()) return []
    return [{ relPath: `global:${picked}`, content }]
  } catch {
    return []
  }
}

function safeList(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}
