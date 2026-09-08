/**
 * Git 技能源可选拉取：只快进 manifest 里的 git 源，本机发现组跳过。
 */
import type { SkillSourceUpdateAllResult } from "@enjoy-agents/ipc-contract"
import { persistDiscoveredSources } from "./source-discover.ts"
import { pullGitSource } from "./source-git.ts"
import { readManifest, type ManifestSource } from "./source-state.ts"
import type { SkillSourceContext } from "./source-service.ts"

export async function pullGitSkillSource(
  ctx: SkillSourceContext,
  sourceId: string,
  afterPull: (sourceId: string) => void
): Promise<void> {
  const source = requireManifestSource(ctx, sourceId)
  if (source.kind !== "git") return
  await pullGitSource(ctx.stateRoot, source.id)
  try {
    afterPull(source.id)
  } catch {
    // 未勾选或目标空：只完成 checkout
  }
}

export async function pullAllGitSkillSources(
  ctx: SkillSourceContext,
  afterPull: (sourceId: string) => void
): Promise<SkillSourceUpdateAllResult> {
  persistDiscoveredSources(ctx)
  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []
  for (const source of readManifest(ctx.stateRoot).sources) {
    if (source.kind !== "git") {
      skippedCount++
      continue
    }
    try {
      await pullGitSource(ctx.stateRoot, source.id)
      updatedCount++
      try {
        afterPull(source.id)
      } catch {
        // 投影失败不记入 errors
      }
    } catch (err) {
      errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { updatedCount, skippedCount, errors }
}

function requireManifestSource(ctx: SkillSourceContext, sourceId: string): ManifestSource {
  const source = persistDiscoveredSources(ctx).find((row) => row.id === sourceId)
  if (!source) throw new Error("SOURCE_NOT_FOUND")
  return source
}
