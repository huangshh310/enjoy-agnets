/**
 * 扫描来源 checkout / 本地目录，产出相对路径技能列表。
 * 支持扫描根目录 SKILL.md、skills/ 目录、直接子包以及嵌套包。
 */
import { basename, join, relative, resolve } from "node:path"
import { existsSync, readdirSync, statSync } from "node:fs"
import { isAbsolute } from "node:path"
import { pathIsInsideRoot } from "@enjoy-agents/db/path-safe"
import type { SkillSourceSkill } from "@enjoy-agents/ipc-contract"
import {
  globalSkillRoots,
  matchRegisteredWorkspace,
  workspaceSkillRoots
} from "../customize-roots.ts"
import { parseSkillFile, scanSkillRoot } from "../skills-service.ts"
import { gitCheckoutPath } from "./source-git.ts"
import type { ManifestSource } from "./source-state.ts"

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".cache"
])

const PRIORITY_SUBDIRS = [
  "skills",
  "skills/.curated",
  ".agents/skills",
  ".claude/skills",
  ".cursor/skills"
] as const

const SKILL_FILENAMES = ["SKILL.md", "skill.md"] as const

export function resolveSourceRoot(source: ManifestSource, stateRoot: string): string {
  if (source.kind === "git") return gitCheckoutPath(stateRoot, source.id)
  return resolve(source.origin)
}

/** 深度查找目录中的技能包，支持根目录单包、skills/* 以及各层级子目录 */
export function findSkillPackagesInDirectory(checkoutPath: string): SkillSourceSkill[] {
  if (!existsSync(checkoutPath)) return []

  const discovered: SkillSourceSkill[] = []
  const visitedFiles = new Set<string>()

  // 1. 检查根目录自身的 SKILL.md (单包 repo)
  for (const fn of SKILL_FILENAMES) {
    const rootFile = join(checkoutPath, fn)
    if (isFile(rootFile)) {
      visitedFiles.add(normalizeKey(rootFile))
      const parsed = parseSkillFile(rootFile)
      discovered.push({
        id: ".",
        name: parsed.name === "." ? basename(checkoutPath) : parsed.name,
        description: parsed.description,
        relativeDir: ".",
        skillFilePath: rootFile,
        trigger: parsed.trigger,
        content: parsed.content
      })
      break
    }
  }

  // 2. 检查常见技能目录：skills/*, .claude/skills/* 等
  for (const priority of PRIORITY_SUBDIRS) {
    const sub = join(checkoutPath, priority)
    collectDirectChildren(checkoutPath, sub, discovered, visitedFiles)
  }

  // 3. 检查当前 checkoutPath 的直接子目录
  collectDirectChildren(checkoutPath, checkoutPath, discovered, visitedFiles)

  // 4. 若仍未发现，或者只有 0 个，进行递归遍历（最多 4 层）
  if (discovered.length === 0) {
    walkTree(checkoutPath, checkoutPath, discovered, visitedFiles, 0)
  }

  return discovered
}

export function discoverSourceSkills(
  source: ManifestSource,
  stateRoot: string,
  workspaceRoots: string[]
): SkillSourceSkill[] {
  const root = resolveSourceRoot(source, stateRoot)
  if (!existsSync(root)) return []

  if (source.kind === "local" && isRegisteredWorkspace(root, workspaceRoots)) {
    const wsSkills = workspaceSkillRoots(root).flatMap((skillRoot) =>
      scanSkillRoot(skillRoot, "workspace").map((item) => ({
        id: toPosixRelative(root, item.directoryPath),
        name: item.name,
        description: item.description,
        relativeDir: toPosixRelative(root, item.directoryPath),
        skillFilePath: item.skillFilePath
      }))
    )
    if (wsSkills.length > 0) return wsSkills
  }

  return findSkillPackagesInDirectory(root)
}

export function assertLocalOriginAllowed(
  origin: string,
  registeredRoots: string[],
  home: string
): string {
  if (!isAbsolute(origin)) throw new Error("Origin must be an absolute path.")
  const abs = resolve(origin)
  try {
    return matchRegisteredWorkspace(abs, registeredRoots)
  } catch {
    if (globalSkillRoots(home).some((root) => pathIsInsideRoot(root, abs))) return abs
    throw new Error("Unknown workspace.")
  }
}

function isRegisteredWorkspace(origin: string, registeredRoots: string[]): boolean {
  try {
    matchRegisteredWorkspace(origin, registeredRoots)
    return true
  } catch {
    return false
  }
}

function isFile(p: string): boolean {
  try {
    return existsSync(p) && statSync(p).isFile()
  } catch {
    return false
  }
}

function normalizeKey(p: string): string {
  return resolve(p).toLowerCase().replaceAll("\\", "/")
}

function collectDirectChildren(
  checkoutPath: string,
  parentDir: string,
  out: SkillSourceSkill[],
  visited: Set<string>
): void {
  if (!existsSync(parentDir)) return
  try {
    const entries = readdirSync(parentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name)) continue
      const dir = join(parentDir, entry.name)
      for (const fn of SKILL_FILENAMES) {
        const file = join(dir, fn)
        const key = normalizeKey(file)
        if (isFile(file) && !visited.has(key)) {
          visited.add(key)
          const parsed = parseSkillFile(file)
          const relativeDir = toPosixRelative(checkoutPath, dir)
          out.push({
            id: relativeDir,
            name: parsed.name,
            description: parsed.description,
            relativeDir,
            skillFilePath: file,
            trigger: parsed.trigger,
            content: parsed.content
          })
          break
        }
      }
    }
  } catch {
    // 忽略权限等异常
  }
}

function walkTree(
  checkoutPath: string,
  current: string,
  out: SkillSourceSkill[],
  visited: Set<string>,
  depth: number
): void {
  if (depth > 4 || !existsSync(current)) return
  try {
    const entries = readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) continue
      const dir = join(current, entry.name)
      for (const fn of SKILL_FILENAMES) {
        const file = join(dir, fn)
        const key = normalizeKey(file)
        if (isFile(file) && !visited.has(key)) {
          visited.add(key)
          const parsed = parseSkillFile(file)
          const relativeDir = toPosixRelative(checkoutPath, dir)
          out.push({
            id: relativeDir,
            name: parsed.name,
            description: parsed.description,
            relativeDir,
            skillFilePath: file,
            trigger: parsed.trigger,
            content: parsed.content
          })
          break
        }
      }
      walkTree(checkoutPath, dir, out, visited, depth + 1)
    }
  } catch {
    // 忽略异常
  }
}

function toPosixRelative(root: string, abs: string): string {
  const rel = relative(root, abs).replaceAll("\\", "/")
  return rel || "."
}
