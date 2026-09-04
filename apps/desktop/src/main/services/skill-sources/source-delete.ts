/**
 * 删除单个技能包，并清理 lock 里的投影副本。不删技能根目录。
 */
import { existsSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { pathIsInsideRoot } from "@enjoy-agents/db/path-safe"
import { deleteSkillPackage } from "../skills-service.ts"
import { discoverSourceSkills, resolveSourceRoot } from "./source-scan.ts"
import {
  readLock,
  readManifest,
  writeLock,
  writeManifest,
  type ManifestSource
} from "./source-state.ts"

type DeleteCtx = {
  home: string
  stateRoot: string
  workspaceRoots: string[]
}

/** 删除来源内一个技能：本机目录删包，Git 来源只拆投影。 */
export function deleteSourceSkill(ctx: DeleteCtx, source: ManifestSource, skillId: string): void {
  const skills = discoverSourceSkills(source, ctx.stateRoot, ctx.workspaceRoots)
  const skill = skills.find((row) => row.id === skillId)
  if (!skill) throw new Error("SKILL_NOT_FOUND")
  if (skill.relativeDir === "." || skill.relativeDir === "") {
    throw new Error("CANNOT_DELETE_SOURCE_ROOT")
  }
  const sourceRoot = resolveSourceRoot(source, ctx.stateRoot)
  const packDir = resolve(join(sourceRoot, skill.relativeDir))
  if (!pathIsInsideRoot(sourceRoot, packDir)) {
    throw new Error("Path is outside source checkout.")
  }
  const packageName = basename(packDir)
  if (source.kind === "local") {
    deleteSkillPackage(packDir, ctx.workspaceRoots, ctx.home)
  }
  removeLockPacks(ctx, source.id, packageName, packDir)
  const manifest = readManifest(ctx.stateRoot)
  const row = manifest.sources.find((item) => item.id === source.id)
  if (!row) return
  row.selectedSkillIds = row.selectedSkillIds.filter((id) => id !== skillId)
  writeManifest(ctx.stateRoot, manifest)
}

/** 卸载来源时删掉投影副本；本机 origin 里的包不删。 */
export function removeSourceProjections(ctx: DeleteCtx, source: ManifestSource): void {
  const origin = source.kind === "local" ? resolve(source.origin) : null
  const lock = readLock(ctx.stateRoot)
  const kept = lock.deployments.filter((row) => {
    if (row.sourceId !== source.id) return true
    if (origin && pathIsInsideRoot(origin, row.destPath)) return false
    tryDeletePack(ctx, row.destPath)
    return false
  })
  writeLock(ctx.stateRoot, { deployments: kept })
}

function removeLockPacks(ctx: DeleteCtx, sourceId: string, packageName: string, localPack: string): void {
  const lock = readLock(ctx.stateRoot)
  writeLock(ctx.stateRoot, {
    deployments: lock.deployments.filter((row) => {
      if (row.sourceId !== sourceId || row.packageName !== packageName) return true
      if (samePath(row.destPath, localPack)) return false
      tryDeletePack(ctx, row.destPath)
      return false
    })
  })
}

function tryDeletePack(ctx: DeleteCtx, destPath: string): void {
  if (!existsSync(destPath)) return
  try {
    deleteSkillPackage(destPath, ctx.workspaceRoots, ctx.home)
  } catch {
    // 非白名单直接子目录则跳过，避免误删技能根
  }
}

function samePath(left: string, right: string): boolean {
  return resolve(left).toLowerCase().replaceAll("\\", "/") === resolve(right).toLowerCase().replaceAll("\\", "/")
}
