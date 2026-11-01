/**
 * 与目录大纲同构的 BFS，另收集可解析源文件路径（受条数上限）。
 */
import {
  collectRepoOutline,
  type ListDirFn,
  type OutlineNode,
  REPO_OUTLINE_MAX_DEPTH,
  REPO_OUTLINE_MAX_ENTRIES
} from "../repo-outline.ts"
import { isSourcePath } from "./languages.ts"
import { REPO_MAP_MAX_SOURCE_FILES } from "./budgets.ts"

export type CollectSourcesResult = {
  outline: OutlineNode[]
  sourceFiles: string[]
}

export async function collectOutlineAndSources(
  listDir: ListDirFn,
  options?: { maxDepth?: number; maxEntries?: number; maxSourceFiles?: number }
): Promise<CollectSourcesResult> {
  const maxDepth = options?.maxDepth ?? REPO_OUTLINE_MAX_DEPTH
  const maxEntries = options?.maxEntries ?? REPO_OUTLINE_MAX_ENTRIES
  const maxSourceFiles = options?.maxSourceFiles ?? REPO_MAP_MAX_SOURCE_FILES
  const outline = await collectRepoOutline(listDir, { maxDepth, maxEntries })
  const sourceFiles: string[] = []
  const seen = new Set<string>()

  for (const node of outline) {
    if (node.kind !== "file") continue
    if (!isSourcePath(node.path)) continue
    if (seen.has(node.path)) continue
    seen.add(node.path)
    sourceFiles.push(node.path)
    if (sourceFiles.length >= maxSourceFiles) {
      return { outline, sourceFiles }
    }
  }

  // 大纲里的目录再扫一层源文件（不加深目录骨架），提高符号命中。
  for (const node of outline) {
    if (sourceFiles.length >= maxSourceFiles) break
    if (node.kind !== "directory") continue
    let entries: Array<{ name: string; kind: "file" | "directory" }> = []
    try {
      entries = await listDir(node.path)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (sourceFiles.length >= maxSourceFiles) break
      if (entry.kind !== "file") continue
      if (entry.name.startsWith(".")) continue
      const rel = `${node.path.replace(/\\/g, "/")}/${entry.name}`
      if (!isSourcePath(rel) || seen.has(rel)) continue
      seen.add(rel)
      sourceFiles.push(rel)
    }
  }

  return { outline, sourceFiles }
}
