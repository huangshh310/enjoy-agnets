/**
 * Customize（Rules / Skills）允许读写的根。
 * renderer 给的绝对路径必须先落到这些根里，再 fs。
 */
import { homedir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { assertAbsInsideRoots, pathIsInsideRoot } from "@enjoy-agents/db/path-safe"

const WORKSPACE_RULE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "CODEX.md",
  "DEEPSEEK.md",
  ".cursorrules",
  ".windsurfrules"
] as const

export function globalRuleRoots(home = homedir()): string[] {
  return [
    join(home, ".enjoy-agents", "rules"),
    join(home, ".cursor", "rules"),
    join(home, ".claude", "rules"),
    join(home, ".omp", "agent"),
    join(home, ".deepseek", "rules"),
    join(home, ".dsh", "rules")
  ]
}

export function workspaceRuleSubdirRoots(workspacePath: string): string[] {
  return [
    join(workspacePath, ".cursor", "rules"),
    join(workspacePath, ".agents", "rules"),
    join(workspacePath, ".claude", "rules"),
    join(workspacePath, ".github")
  ]
}

export function globalSkillRoots(home = homedir()): string[] {
  return [
    join(home, ".enjoy-agents", "skills"),
    join(home, ".agents", "skills"),
    join(home, ".claude", "skills"),
    join(home, ".codex", "skills"),
    join(home, ".cursor", "skills"),
    join(home, ".omp", "skills"),
    join(home, ".pi", "agent", "skills"),
    join(home, ".grok", "skills"),
    join(home, ".gemini", "antigravity", "skills"),
    join(home, ".antigravity", "skills"),
    join(home, ".gemini", "skills"),
    join(home, ".config", "opencode", "skills"),
    join(home, ".opencode", "skills"),
    join(home, ".hermes", "skills"),
    join(home, ".amp", "skills"),
    join(home, ".deepseek", "skills"),
    join(home, ".dsh", "skills")
  ]
}

export function workspaceSkillRoots(workspacePath: string): string[] {
  return [
    join(workspacePath, ".agents", "skills"),
    join(workspacePath, ".claude", "skills"),
    join(workspacePath, ".cursor", "skills"),
    join(workspacePath, "skills"),
    join(workspacePath, ".skills")
  ]
}

export function matchRegisteredWorkspace(requested: string, registeredRoots: string[]): string {
  const abs = resolve(requested)
  const hit = registeredRoots.find((root) => pathIsInsideRoot(root, abs) && pathIsInsideRoot(abs, root))
  if (!hit) throw new Error("Unknown workspace.")
  return resolve(hit)
}

/** 规则文件：全局规则目录、工作区 rules 子目录，或工作区根上的已知文件名。 */
export function assertAllowedRuleFile(absPath: string, workspaceRoots: string[], home = homedir()): string {
  const target = resolve(absPath)
  const subdirs = [...globalRuleRoots(home), ...workspaceRoots.flatMap(workspaceRuleSubdirRoots)]
  try {
    return assertAbsInsideRoots(target, subdirs)
  } catch {
    // 根文件名白名单，避免把整个工作区当成可删根
  }
  const name = basename(target)
  for (const ws of workspaceRoots) {
    const wsAbs = resolve(ws)
    if (WORKSPACE_RULE_FILES.includes(name as (typeof WORKSPACE_RULE_FILES)[number])) {
      if (pathIsInsideRoot(wsAbs, target) && pathIsInsideRoot(dirname(target), wsAbs)) return target
    }
    if (name === "copilot-instructions.md") {
      const expected = resolve(wsAbs, ".github", "copilot-instructions.md")
      if (pathIsInsideRoot(expected, target) && pathIsInsideRoot(target, expected)) return target
    }
  }
  const ompAgents = resolve(join(home, ".omp", "agent", "AGENTS.md"))
  if (pathIsInsideRoot(ompAgents, target) && pathIsInsideRoot(target, ompAgents)) return target
  throw new Error("Path is outside allowed rule locations.")
}

export function assertAllowedSkillFile(absPath: string, workspaceRoots: string[], home = homedir()): string {
  const roots = [
    ...globalSkillRoots(home),
    join(home, ".enjoy-agents", "skill-sources", "source"),
    ...workspaceRoots.flatMap(workspaceSkillRoots)
  ]
  return assertAbsInsideRoots(absPath, roots)
}

/** 技能包目录必须是某个 skill root 的直接子目录，不能删根。 */
export function assertAllowedSkillPackage(
  directoryPath: string,
  workspaceRoots: string[],
  home = homedir()
): string {
  const abs = resolve(directoryPath)
  const roots = [...globalSkillRoots(home), ...workspaceRoots.flatMap(workspaceSkillRoots)].map((root) =>
    resolve(root)
  )
  if (roots.some((root) => pathIsInsideRoot(root, abs) && pathIsInsideRoot(abs, root))) {
    throw new Error("Refusing to delete a skill root.")
  }
  const parent = resolve(dirname(abs))
  if (!roots.some((root) => pathIsInsideRoot(root, parent) && pathIsInsideRoot(parent, root))) {
    throw new Error("Path is outside allowed skill locations.")
  }
  return abs
}
