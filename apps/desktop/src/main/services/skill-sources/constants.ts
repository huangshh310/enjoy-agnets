/**
 * 技能来源 状态根与目标相对路径。
 * 部署目的地必须能通过 customize-roots 白名单。
 */
import { existsSync, renameSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { assertAbsInsideRoots } from "@enjoy-agents/db/path-safe"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import { globalSkillRoots, workspaceSkillRoots } from "../customize-roots.ts"

export const STATE_DIRNAME = "skill-sources"

export const TARGET_RELATIVE: Record<SkillTargetId, string[]> = {
  "enjoy-agents": [".enjoy-agents", "skills"],
  agents: [".agents", "skills"],
  claude: [".claude", "skills"],
  codex: [".codex", "skills"],
  cursor: [".cursor", "skills"],
  grok: [".grok", "skills"],
  antigravity: [".gemini", "antigravity", "skills"],
  gemini: [".gemini", "skills"],
  opencode: [".config", "opencode", "skills"],
  omp: [".omp", "skills"],
  pi: [".pi", "agent", "skills"],
  hermes: [".hermes", "skills"],
  amp: [".amp", "skills"],
  deepseek: [".deepseek", "skills"],
  "workspace-agents": [".agents", "skills"],
  "workspace-claude": [".claude", "skills"],
  "workspace-cursor": [".cursor", "skills"],
  "workspace-skills": ["skills"],
  "workspace-dot-skills": [".skills"]
}

/** 宿主真源：默认只投影到 Enjoy 目录与工作区 .agents/skills。 */
export const HOST_SKILL_DEPLOY_TARGETS = new Set<SkillTargetId>([
  "enjoy-agents",
  "workspace-agents"
])

const WORKSPACE_TARGETS = new Set<SkillTargetId>([
  "workspace-agents",
  "workspace-claude",
  "workspace-cursor",
  "workspace-skills",
  "workspace-dot-skills"
])

export function isWorkspaceTarget(id: SkillTargetId): boolean {
  return WORKSPACE_TARGETS.has(id)
}

export function skillSourceStateRoot(home = homedir()): string {
  const next = join(home, ".enjoy-agents", STATE_DIRNAME)
  const legacy = join(home, ".enjoy-agents", "skillflow")
  if (!existsSync(next) && existsSync(legacy)) {
    try {
      renameSync(legacy, next)
    } catch {
      return legacy
    }
  }
  return next
}

/** 将目标 id 解析为绝对路径；workspace-* 无工作区即拒。 */
export function resolveSkillTarget(
  id: SkillTargetId,
  home: string,
  workspacePath?: string
): string {
  const rel = TARGET_RELATIVE[id]
  if (isWorkspaceTarget(id)) {
    if (!workspacePath) throw new Error("Open a workspace first.")
    return join(workspacePath, ...rel)
  }
  return join(home, ...rel)
}

export function allowedSkillTargetRoots(home: string, workspaceRoots: string[]): string[] {
  return [...globalSkillRoots(home), ...workspaceRoots.flatMap(workspaceSkillRoots)]
}

export function assertSkillTargetAllowed(
  absPath: string,
  home: string,
  workspaceRoots: string[]
): string {
  return assertAbsInsideRoots(absPath, allowedSkillTargetRoots(home, workspaceRoots))
}
