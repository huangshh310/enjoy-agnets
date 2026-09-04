/**
 * 本机 Agent 技能根自动发现。首次扫描后写入 manifest，后续变异才找得到来源。
 */
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import { TARGET_RELATIVE } from "./constants.ts"
import { findSkillPackagesInDirectory } from "./source-scan.ts"
import { readManifest, writeManifest, type ManifestSource } from "./source-state.ts"

const GLOBAL_DETECT: SkillTargetId[] = [
  "enjoy-agents",
  "agents",
  "claude",
  "codex",
  "cursor",
  "omp",
  "pi"
]

const WORKSPACE_DETECT: SkillTargetId[] = [
  "workspace-agents",
  "workspace-claude",
  "workspace-cursor",
  "workspace-skills",
  "workspace-dot-skills"
]

export const TARGET_TITLES: Partial<Record<SkillTargetId, string>> = {
  "enjoy-agents": "Enjoy 已安装技能",
  agents: "Standard Agents 已安装技能",
  claude: "Claude Code 已安装技能",
  codex: "Codex 已安装技能",
  cursor: "Cursor 已安装技能",
  omp: "Oh My Pi 已安装技能",
  pi: "Pi 已安装技能",
  "workspace-agents": "工作区 Agents 技能",
  "workspace-claude": "工作区 Claude 技能",
  "workspace-cursor": "工作区 Cursor 技能",
  "workspace-skills": "工作区 skills 技能",
  "workspace-dot-skills": "工作区 .skills 技能"
}

export type DiscoverInput = {
  home: string
  stateRoot: string
  workspacePath?: string
}

/** 扫描本机/工作区技能根，跳过 manifest 里已有的 origin 与 id。 */
export function detectLocalAgentSources(input: DiscoverInput): ManifestSource[] {
  const manifest = readManifest(input.stateRoot)
  const existingIds = new Set(manifest.sources.map((row) => row.id))
  const existingOrigins = new Set(
    manifest.sources.filter((row) => row.kind === "local").map((row) => normPath(row.origin))
  )
  const result: ManifestSource[] = []

  for (const { targetId, dir } of listCandidateRoots(input)) {
    if (!existsSync(dir)) continue
    const key = normPath(dir)
    if (existingOrigins.has(key)) continue
    if ((manifest.ignoredOrigins ?? []).some((origin) => normPath(origin) === key)) continue
    const found = findSkillPackagesInDirectory(dir)
    if (found.length === 0) continue
    const id = `local-${targetId}-skills`
    if (existingIds.has(id)) continue
    result.push({
      id,
      name: TARGET_TITLES[targetId] ?? `${targetId} 本机技能`,
      kind: "local",
      origin: dir,
      selectedSkillIds: found.map((skill) => skill.id),
      enabledTargetIds: [targetId]
    })
    existingOrigins.add(key)
    existingIds.add(id)
  }
  return result
}

/** 把新发现的来源追加进 manifest；已存在则原样返回。 */
export function persistDiscoveredSources(input: DiscoverInput): ManifestSource[] {
  const manifest = readManifest(input.stateRoot)
  const detected = detectLocalAgentSources(input)
  if (detected.length === 0) return manifest.sources
  const sources = [...manifest.sources, ...detected]
  writeManifest(input.stateRoot, { ...manifest, sources })
  return sources
}

function listCandidateRoots(input: DiscoverInput): Array<{ targetId: SkillTargetId; dir: string }> {
  const roots = GLOBAL_DETECT.map((targetId) => ({
    targetId,
    dir: join(input.home, ...TARGET_RELATIVE[targetId])
  }))
  if (!input.workspacePath || !existsSync(input.workspacePath)) return roots
  for (const targetId of WORKSPACE_DETECT) {
    roots.push({
      targetId,
      dir: join(input.workspacePath, ...TARGET_RELATIVE[targetId])
    })
  }
  return roots
}

function normPath(value: string): string {
  return resolve(value).toLowerCase().replaceAll("\\", "/")
}
