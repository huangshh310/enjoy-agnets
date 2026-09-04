/**
 * 技能来源 权威状态：只信 manifest.json / lock.json，不信目标目录。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { SkillSourceKind, SkillTargetId } from "@enjoy-agents/ipc-contract"

export type ManifestSource = {
  id: string
  name: string
  kind: SkillSourceKind
  origin: string
  selectedSkillIds: string[]
  enabledTargetIds: SkillTargetId[]
}

export type SkillSourceManifest = {
  sources: ManifestSource[]
  ignoredOrigins?: string[]
}

export type LockDeployment = {
  sourceId: string
  targetId: SkillTargetId
  packageName: string
  destPath: string
}

export type SkillSourceLock = {
  deployments: LockDeployment[]
}

export function readManifest(stateRoot: string): SkillSourceManifest {
  return readJson(join(stateRoot, "manifest.json"), { sources: [] })
}

export function writeManifest(stateRoot: string, manifest: SkillSourceManifest): void {
  writeJson(stateRoot, "manifest.json", manifest)
}

export function readLock(stateRoot: string): SkillSourceLock {
  return readJson(join(stateRoot, "lock.json"), { deployments: [] })
}

export function writeLock(stateRoot: string, lock: SkillSourceLock): void {
  writeJson(stateRoot, "lock.json", lock)
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(stateRoot: string, fileName: string, value: unknown): void {
  mkdirSync(stateRoot, { recursive: true })
  writeFileSync(join(stateRoot, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8")
}
