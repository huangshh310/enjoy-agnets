/**
 * 把宿主技能目录收成 Grok `--plugin-dir`：只含 plugin.json + skills，不含 hooks / MCP。
 * SSH 远端看不见本机路径，调用方不得在 ssh 时传这些目录。
 */
import { createHash } from "node:crypto"
import { existsSync, lstatSync, mkdirSync, readdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

const PLUGIN_MANIFEST = {
  name: "enjoy-host-skills",
  version: "1.0.0",
  description: "Enjoy host skill catalog. Skills only — no hooks."
} as const

/** 全局 ~/.enjoy-agents/skills 与工作区 .agents/skills 各收成一只 plugin-dir。 */
export function stageGrokHostPluginDirs(input: {
  home?: string
  workspaceRoot?: string
}): string[] {
  const home = input.home ?? homedir()
  const dirs: string[] = []
  const globalSkills = join(home, ".enjoy-agents", "skills")
  const globalPlugin = join(home, ".enjoy-agents", "grok-plugin")
  const stagedGlobal = stageGrokHostPlugin(globalSkills, globalPlugin)
  if (stagedGlobal) dirs.push(stagedGlobal)
  const workspaceRoot = input.workspaceRoot?.trim()
  if (workspaceRoot) {
    const wsSkills = join(workspaceRoot, ".agents", "skills")
    const wsPlugin = join(home, ".enjoy-agents", "grok-plugin-ws", workspacePluginId(workspaceRoot))
    const stagedWs = stageGrokHostPlugin(wsSkills, wsPlugin)
    if (stagedWs) dirs.push(stagedWs)
  }
  return dirs
}

export function stageGrokHostPlugin(skillsRoot: string, pluginRoot: string): string | undefined {
  const absSkills = resolve(skillsRoot)
  if (!hasSkillPacks(absSkills)) return undefined
  mkdirSync(pluginRoot, { recursive: true })
  writeFileSync(join(pluginRoot, "plugin.json"), `${JSON.stringify(PLUGIN_MANIFEST, null, 2)}\n`, "utf8")
  linkSkillsDir(join(pluginRoot, "skills"), absSkills)
  return resolve(pluginRoot)
}

function hasSkillPacks(skillsRoot: string): boolean {
  if (!existsSync(skillsRoot)) return false
  try {
    return readdirSync(skillsRoot, { withFileTypes: true }).some((entry) => entry.isDirectory())
  } catch {
    return false
  }
}

function linkSkillsDir(linkPath: string, target: string) {
  try {
    const stat = lstatSync(linkPath)
    if (stat.isSymbolicLink()) unlinkSync(linkPath)
    else if (stat.isDirectory() || stat.isFile()) return
  } catch {
    // 没有旧链接就新建。
  }
  symlinkSync(target, linkPath, "junction")
}

function workspacePluginId(workspaceRoot: string): string {
  return createHash("sha1").update(resolve(workspaceRoot)).digest("hex").slice(0, 12)
}
