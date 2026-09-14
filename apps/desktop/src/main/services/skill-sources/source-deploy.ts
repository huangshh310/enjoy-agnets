/**
 * 技能来源 投影：把 checkout 内选中包复制到白名单目标。
 */
import { cpSync, mkdirSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { pathIsInsideRoot } from "@enjoy-agents/db/path-safe"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import { assertAllowedSkillPackage } from "../customize-roots.ts"
import { assertSkillTargetAllowed, HOST_SKILL_DEPLOY_TARGETS, resolveSkillTarget } from "./constants.ts"
import type { LockDeployment } from "./source-state.ts"

export function copySkillPackToTarget(input: {
  srcPack: string
  sourceRoot: string
  destPack: string
  home: string
  workspaceRoots: string[]
}): void {
  const sourceRoot = resolve(input.sourceRoot)
  const srcPack = resolve(input.srcPack)
  if (!pathIsInsideRoot(sourceRoot, srcPack)) {
    throw new Error("Path is outside source checkout.")
  }
  const destPack = assertAllowedSkillPackage(input.destPack, input.workspaceRoots, input.home)
  mkdirSync(dirname(destPack), { recursive: true })
  cpSync(srcPack, destPack, { recursive: true })
}

export function deploySelectedSkills(input: {
  sourceId: string
  sourceRoot: string
  selectedRelativeDirs: string[]
  targetIds: SkillTargetId[]
  home: string
  workspaceRoots: string[]
  workspacePath?: string
}): LockDeployment[] {
  if (input.selectedRelativeDirs.length === 0) {
    throw new Error("EMPTY_SELECTION")
  }
  const targetIds = input.targetIds.filter((id) => HOST_SKILL_DEPLOY_TARGETS.has(id))
  if (targetIds.length === 0) return []
  const deployments: LockDeployment[] = []
  for (const relativeDir of input.selectedRelativeDirs) {
    const srcPack = resolve(join(input.sourceRoot, relativeDir))
    const packageName = basename(srcPack)
    for (const targetId of targetIds) {
      const targetRoot = resolveSkillTarget(targetId, input.home, input.workspacePath)
      assertSkillTargetAllowed(targetRoot, input.home, input.workspaceRoots)
      const destPack = join(targetRoot, packageName)
      if (!samePath(srcPack, destPack)) {
        copySkillPackToTarget({
          srcPack,
          sourceRoot: input.sourceRoot,
          destPack,
          home: input.home,
          workspaceRoots: input.workspaceRoots
        })
      }
      deployments.push({
        sourceId: input.sourceId,
        targetId,
        packageName,
        destPath: destPack
      })
    }
  }
  return deployments
}

function samePath(left: string, right: string): boolean {
  return resolve(left).toLowerCase().replaceAll("\\", "/") === resolve(right).toLowerCase().replaceAll("\\", "/")
}
