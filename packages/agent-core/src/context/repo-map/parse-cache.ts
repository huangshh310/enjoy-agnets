/**
 * 按 relativePath + mtimeMs + GRAMMAR_VERSION（+ grammarId）缓存签名解析结果。
 * 工作区根变更时清空。
 */
import { GRAMMAR_VERSION, type GrammarId } from "./languages.ts"

export type CachedSignatures = {
  signatures: string[]
  mtimeMs: number
  grammarId: GrammarId
  grammarVersion: string
}

type CacheEntry = CachedSignatures

let cacheWorkspaceRoot: string | null = null
const cache = new Map<string, CacheEntry>()

export function makeParseCacheKey(
  relativePath: string,
  mtimeMs: number,
  grammarId: GrammarId,
  grammarVersion = GRAMMAR_VERSION
): string {
  const norm = relativePath.replace(/\\/g, "/")
  return `${norm}|${mtimeMs}|${grammarVersion}|${grammarId}`
}

/** 工作区根变更（或显式调用）时清空缓存。 */
export function clearRepoMapParseCache(workspaceRoot?: string | null): void {
  cache.clear()
  cacheWorkspaceRoot = workspaceRoot ?? null
}

export function ensureParseCacheWorkspace(workspaceRoot: string | null | undefined): void {
  const next = workspaceRoot ?? null
  if (cacheWorkspaceRoot !== next) {
    cache.clear()
    cacheWorkspaceRoot = next
  }
}

export function getCachedSignatures(key: string): CachedSignatures | undefined {
  return cache.get(key)
}

export function setCachedSignatures(key: string, entry: CachedSignatures): void {
  cache.set(key, entry)
}

/** 测试用：当前条目数。 */
export function repoMapParseCacheSizeForTests(): number {
  return cache.size
}
