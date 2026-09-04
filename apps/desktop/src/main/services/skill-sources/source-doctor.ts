/**
 * 技能来源 doctor：对照 manifest / lock / 磁盘，产出警告码。
 */
import { existsSync, readFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { pathIsInsideRoot } from "@enjoy-agents/db/path-safe"
import type { SkillSourceWarning } from "@enjoy-agents/ipc-contract"
import { discoverSourceSkills, resolveSourceRoot } from "./source-scan.ts"
import { readLock, readManifest, type ManifestSource } from "./source-state.ts"

const SKILL_FILES = ["SKILL.md", "skill.md", "README.md"] as const

export type DoctorContext = {
  stateRoot: string
  workspaceRoots: string[]
}

export function doctorSkillSources(ctx: DoctorContext): SkillSourceWarning[] {
  const warnings: SkillSourceWarning[] = []
  const lock = readLock(ctx.stateRoot)
  for (const source of readManifest(ctx.stateRoot).sources) {
    const root = resolveSourceRoot(source, ctx.stateRoot)
    if (!existsSync(root)) {
      warnings.push(warn(source.id, "MISSING_CHECKOUT", "Source checkout is missing."))
    }
    if (source.selectedSkillIds.length === 0 || source.enabledTargetIds.length === 0) {
      warnings.push(warn(source.id, "EMPTY_SELECTION", "No skills or targets selected."))
    }
    const skills = existsSync(root) ? discoverSourceSkills(source, ctx.stateRoot, ctx.workspaceRoots) : []
    for (const deployment of lock.deployments.filter((row) => row.sourceId === source.id)) {
      pushDeploymentWarning(warnings, source, root, skills, deployment.destPath, deployment.packageName)
    }
  }
  return warnings
}

function pushDeploymentWarning(
  warnings: SkillSourceWarning[],
  source: ManifestSource,
  sourceRoot: string,
  skills: { relativeDir: string }[],
  destPath: string,
  packageName: string
): void {
  if (!existsSync(destPath)) {
    warnings.push(warn(source.id, "MISSING_TARGET", "Deployed package is missing."))
    return
  }
  const srcPack = findSourcePack(
    sourceRoot,
    skills.map((skill) => skill.relativeDir),
    packageName
  )
  if (srcPack && skillMarkdown(srcPack) !== skillMarkdown(destPath)) {
    warnings.push(warn(source.id, "DRIFT", "Deployed package drifted from source."))
  }
}

export function findSourcePack(
  sourceRoot: string,
  selectedRelativeDirs: string[],
  packageName: string
): string | null {
  for (const relativeDir of selectedRelativeDirs) {
    if (relativeDir === "." && basename(sourceRoot) === packageName) return sourceRoot
    if (basename(relativeDir) !== packageName) continue
    const pack = resolve(join(sourceRoot, relativeDir))
    if (pathIsInsideRoot(sourceRoot, pack)) return pack
  }
  const fallback = resolve(join(sourceRoot, packageName))
  return pathIsInsideRoot(sourceRoot, fallback) ? fallback : null
}

export function skillMarkdown(dir: string): string | null {
  for (const name of SKILL_FILES) {
    const full = join(dir, name)
    if (existsSync(full)) return readFileSync(full, "utf8")
  }
  return null
}

function warn(sourceId: string, code: string, message: string): SkillSourceWarning {
  return { sourceId, code, message }
}
