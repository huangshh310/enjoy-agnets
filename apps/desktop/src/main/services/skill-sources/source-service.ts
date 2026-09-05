/**
 * 技能来源 编排：来源增删、配置、投影与总览。
 */
import { basename, resolve } from "node:path"
import { existsSync } from "node:fs"
import type {
  InstalledSkillItem,
  SkillSourceAddInput,
  SkillSourceConfigureInput,
  SkillSourceDetail,
  SkillSourceHealth,
  SkillSourceOverview,
  SkillSource
} from "@enjoy-agents/ipc-contract"

import { cloneGitSource, parseGitOrigin, pullGitSource, removeGitCheckout } from "./source-git.ts"

import { fetchSkillsMarket } from "./skills-market-fetcher.ts"
import { persistDiscoveredSources } from "./source-discover.ts"
import { deleteSourceSkill as deleteSkillPack, removeSourceProjections } from "./source-delete.ts"
import { doctorSkillSources } from "./source-doctor.ts"
import { deploySelectedSkills } from "./source-deploy.ts"
import {
  assertLocalOriginAllowed,
  discoverSourceSkills,
  resolveSourceRoot
} from "./source-scan.ts"
import {
  readLock,
  readManifest,
  writeLock,
  writeManifest,
  type ManifestSource
} from "./source-state.ts"

export type SkillSourceContext = {
  home: string
  stateRoot: string
  workspaceRoots: string[]
  workspacePath?: string
}

export function overviewSkillSources(ctx: SkillSourceContext): SkillSourceOverview {
  const allSources = persistDiscoveredSources(ctx)
  const warnings = doctorSkillSources(ctx)
  const sources = allSources.map((source) => presentSource(source, ctx, warnings))
  const totalSkills = sources.reduce((acc, s) => acc + s.skillCount, 0)
  return {
    sources,
    installedCount: totalSkills,
    driftCount: sources.filter((source) => source.health === "drift").length
  }
}

export function detailSkillSource(ctx: SkillSourceContext, sourceId: string): SkillSourceDetail {
  const source = requireSource(ctx, sourceId)
  const warnings = doctorSkillSources(ctx).filter((row) => row.sourceId === sourceId)
  return {
    source: presentSource(source, ctx, warnings),
    skills: discoverSourceSkills(source, ctx.stateRoot, ctx.workspaceRoots)
  }
}

/** 全量列出所有来源包下的具体技能，供 C 端直接按技能浏览与检索 */
export function listAllInstalledSkills(ctx: SkillSourceContext): InstalledSkillItem[] {
  const allSources = persistDiscoveredSources(ctx)
  const items: InstalledSkillItem[] = []
  for (const source of allSources) {
    const skills = discoverSourceSkills(source, ctx.stateRoot, ctx.workspaceRoots)
    for (const skill of skills) {
      items.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceKind: source.kind,
        enabledTargetIds: source.enabledTargetIds,
        ...skill
      })
    }
  }
  return items
}

export async function addSkillSource(
  ctx: SkillSourceContext,
  input: SkillSourceAddInput
): Promise<SkillSource> {
  if (input.kind === "git") return addGitSource(ctx, input)
  return addLocalSource(ctx, input)
}

export async function updateSkillSource(ctx: SkillSourceContext, sourceId: string): Promise<void> {
  const source = requireSource(ctx, sourceId)
  if (source.kind === "git") await pullGitSource(ctx.stateRoot, source.id)
}

export function removeSkillSource(ctx: SkillSourceContext, sourceId: string): void {
  const source = requireSource(ctx, sourceId)
  removeSourceProjections(ctx, source)
  const manifest = readManifest(ctx.stateRoot)
  const ignoredOrigins = [...(manifest.ignoredOrigins ?? [])]
  if (source.kind === "local") ignoredOrigins.push(source.origin)
  writeManifest(ctx.stateRoot, {
    ...manifest,
    sources: manifest.sources.filter((row) => row.id !== sourceId),
    ignoredOrigins
  })
  if (source.kind === "git") removeGitCheckout(ctx.stateRoot, source.id)
}

export function deleteSourceSkill(ctx: SkillSourceContext, sourceId: string, skillId: string): void {
  deleteSkillPack(ctx, requireSource(ctx, sourceId), skillId)
}

export function configureSkillSource(ctx: SkillSourceContext, input: SkillSourceConfigureInput): void {
  persistDiscoveredSources(ctx)
  const manifest = readManifest(ctx.stateRoot)
  const existing = manifest.sources.find((row) => row.id === input.sourceId)
  if (existing) {
    existing.selectedSkillIds = input.selectedSkillIds
    existing.enabledTargetIds = input.enabledTargetIds
  } else {
    const found = requireSource(ctx, input.sourceId)
    manifest.sources.push({
      ...found,
      selectedSkillIds: input.selectedSkillIds,
      enabledTargetIds: input.enabledTargetIds
    })
  }
  writeManifest(ctx.stateRoot, manifest)
}

export function deploySkillSource(ctx: SkillSourceContext, sourceId: string): void {
  const source = requireSource(ctx, sourceId)
  const sourceRoot = resolveSourceRoot(source, ctx.stateRoot)
  if (!existsSync(sourceRoot)) throw new Error("MISSING_CHECKOUT")
  const created = deploySelectedSkills({
    sourceId: source.id,
    sourceRoot,
    selectedRelativeDirs: source.selectedSkillIds,
    targetIds: source.enabledTargetIds,
    home: ctx.home,
    workspaceRoots: ctx.workspaceRoots,
    workspacePath: ctx.workspacePath
  })
  const lock = readLock(ctx.stateRoot)
  writeLock(ctx.stateRoot, {
    deployments: [...lock.deployments.filter((row) => row.sourceId !== source.id), ...created]
  })
}

export function listSkillSourceWarnings(ctx: SkillSourceContext) {
  persistDiscoveredSources(ctx)
  return doctorSkillSources(ctx)
}

export async function getCuratedSkillSources(ctx?: SkillSourceContext) {
  return fetchSkillsMarket(ctx?.stateRoot)
}

export async function updateAllSkillSources(ctx: SkillSourceContext): Promise<{ updatedCount: number; errors: string[] }> {
  const manifest = readManifest(ctx.stateRoot)
  let updatedCount = 0
  const errors: string[] = []
  for (const source of manifest.sources) {
    if (source.kind === "git") {
      try {
        await pullGitSource(ctx.stateRoot, source.id)
        updatedCount++
      } catch (err) {
        errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
  return { updatedCount, errors }
}

export function repairSkillTargets(ctx: SkillSourceContext, sourceId?: string): { repairedCount: number } {
  persistDiscoveredSources(ctx)
  const manifest = readManifest(ctx.stateRoot)
  const targets = sourceId
    ? manifest.sources.filter((s) => s.id === sourceId)
    : manifest.sources
  let repairedCount = 0
  for (const source of targets) {
    try {
      deploySkillSource(ctx, source.id)
      repairedCount++
    } catch {
      // 忽略无法部署的损坏源
    }
  }
  return { repairedCount }
}

async function addGitSource(ctx: SkillSourceContext, input: SkillSourceAddInput): Promise<SkillSource> {
  const parsed = parseGitOrigin(input.origin)
  assertSourceIdFree(ctx, parsed.sourceId)
  await cloneGitSource(ctx.stateRoot, input.origin)
  const record: ManifestSource = {
    id: parsed.sourceId,
    name: input.name?.trim() || parsed.sourceId,
    kind: "git",
    origin: parsed.url,
    selectedSkillIds: [],
    enabledTargetIds: ["enjoy-agents"]
  }
  record.selectedSkillIds = discoverSourceSkills(record, ctx.stateRoot, ctx.workspaceRoots).map((skill) => skill.id)
  appendSource(ctx, record)
  return presentSource(record, ctx, [])
}

function addLocalSource(ctx: SkillSourceContext, input: SkillSourceAddInput): SkillSource {
  const origin = assertLocalOriginAllowed(input.origin, ctx.workspaceRoots, ctx.home)
  const id = localSourceId(origin)
  assertSourceIdFree(ctx, id)
  assertLocalOriginFree(ctx, origin)
  const record: ManifestSource = {
    id,
    name: input.name?.trim() || basename(origin),
    kind: "local",
    origin,
    selectedSkillIds: [],
    enabledTargetIds: ["enjoy-agents"]
  }
  record.selectedSkillIds = discoverSourceSkills(record, ctx.stateRoot, ctx.workspaceRoots).map((skill) => skill.id)
  appendSource(ctx, record)
  return presentSource(record, ctx, [])
}

function appendSource(ctx: SkillSourceContext, record: ManifestSource): void {
  const manifest = readManifest(ctx.stateRoot)
  const originKey = resolve(record.origin).toLowerCase().replaceAll("\\", "/")
  const ignoredOrigins = (manifest.ignoredOrigins ?? []).filter(
    (origin) => resolve(origin).toLowerCase().replaceAll("\\", "/") !== originKey
  )
  writeManifest(ctx.stateRoot, {
    ...manifest,
    sources: [...manifest.sources, record],
    ignoredOrigins
  })
}

function assertSourceIdFree(ctx: SkillSourceContext, sourceId: string): void {
  persistDiscoveredSources(ctx)
  if (readManifest(ctx.stateRoot).sources.some((row) => row.id === sourceId)) {
    throw new Error("SOURCE_EXISTS")
  }
}

function assertLocalOriginFree(ctx: SkillSourceContext, origin: string): void {
  persistDiscoveredSources(ctx)
  const key = resolve(origin).toLowerCase().replaceAll("\\", "/")
  const taken = readManifest(ctx.stateRoot).sources.some(
    (row) => row.kind === "local" && resolve(row.origin).toLowerCase().replaceAll("\\", "/") === key
  )
  if (taken) throw new Error("SOURCE_EXISTS")
}

function requireSource(ctx: SkillSourceContext, sourceId: string): ManifestSource {
  const source = persistDiscoveredSources(ctx).find((row) => row.id === sourceId)
  if (!source) throw new Error("SOURCE_NOT_FOUND")
  return source
}

function presentSource(
  source: ManifestSource,
  ctx: SkillSourceContext,
  warnings: { sourceId: string; code: string }[]
): SkillSource {
  const mine = warnings.filter((row) => row.sourceId === source.id)
  return {
    ...source,
    health: sourceHealth(source, ctx, mine),
    warningCount: mine.length,
    skillCount: sourceSkillCount(source, ctx)
  }
}

function sourceHealth(
  source: ManifestSource,
  ctx: SkillSourceContext,
  warnings: { code: string }[]
): SkillSourceHealth {
  try {
    if (!existsSync(resolveSourceRoot(source, ctx.stateRoot))) return "missing"
    if (warnings.some((row) => row.code === "DRIFT" || row.code === "MISSING_TARGET")) return "drift"
    return "ok"
  } catch {
    return "error"
  }
}

function sourceSkillCount(source: ManifestSource, ctx: SkillSourceContext): number {
  try {
    return discoverSourceSkills(source, ctx.stateRoot, ctx.workspaceRoots).length
  } catch {
    return 0
  }
}


function localSourceId(abs: string): string {
  const hex = Buffer.from(resolve(abs)).toString("hex").slice(-8)
  return `local-${basename(abs)}-${hex}`.toLowerCase().replace(/[^a-z0-9_.-]+/g, "-")
}

