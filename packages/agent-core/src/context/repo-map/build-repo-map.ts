/**
 * repo_outline 符号地图编排：wasm 成功 → 签名（相关度排序 + 解析缓存）；失败 / 远程 → 目录模式。
 */
import { stat } from "node:fs/promises"
import { join } from "node:path"
import { formatRepoOutline, type ListDirFn } from "../repo-outline.ts"
import { REPO_MAP_MAX_FILE_CHARS, REPO_MAP_TOKEN_BUDGET } from "./budgets.ts"
import { collectOutlineAndSources } from "./collect-sources.ts"
import { directoryModeBanner, SYMBOL_MAP_UNAVAILABLE_NOTE } from "./degrade.ts"
import { formatSymbolMap, type FileSymbols } from "./format-symbol-map.ts"
import {
  createGitRecentChangeLoader,
  mtimeChangeScores,
  type LoadRecentChangeScores
} from "./git-recency.ts"
import { GRAMMAR_VERSION, grammarForPath, type GrammarId } from "./languages.ts"
import {
  clearRepoMapParseCache,
  ensureParseCacheWorkspace,
  getCachedSignatures,
  makeParseCacheKey,
  setCachedSignatures
} from "./parse-cache.ts"
import { rankByRelevance } from "./relevance.ts"
import { extractSignatures } from "./signatures.ts"
import { ensureWasmReady, type WasmHostOptions } from "./wasm-host.ts"

export type ReadFileFn = (relativePath: string) => Promise<string>

export type ExtractSignaturesFn = (
  source: string,
  grammarId: GrammarId,
  options?: WasmHostOptions
) => Promise<string[] | null>

export type BuildRepoMapOptions = {
  maxDepth?: number
  tokenBudget?: number
  /** SSH / 非本地 / 单测强制目录模式。 */
  forceDirectoryMode?: boolean
  wasm?: WasmHostOptions
  /** 最近一次占用，供 Inspect 接线（PR C）；本 PR 只维护数值。 */
  onOccupancy?: (info: RepoMapOccupancy) => void
  /** 工作区根：解析缓存分区 + 默认 mtime/git 信号。 */
  workspaceRoot?: string
  /** 可注入 mtime；缺省且有 workspaceRoot 时走 fs.stat。 */
  getMtimeMs?: (relativePath: string) => Promise<number | null>
  /** 可注入近期改动分；缺省且有 workspaceRoot 时走 git log --name-only。 */
  loadRecentChangeScores?: LoadRecentChangeScores
  /** 预置改动分（单测）；若提供则不再调 loadRecentChangeScores。 */
  recentChangeScores?: ReadonlyMap<string, number> | Record<string, number>
  /** 可注入签名抽取（单测计数）。 */
  extractSignaturesFn?: ExtractSignaturesFn
}

export type RepoMapOccupancy = {
  mode: "symbol" | "directory"
  chars: number
  approxTokens: number
  tokenBudget: number
  note?: string
}

export type BuildRepoMapResult = {
  outline: string
  mode: "symbol" | "directory"
  count: number
  occupancy: RepoMapOccupancy
}

let lastOccupancy: RepoMapOccupancy | null = null

/** Inspect Prompt 占用钩子（C 可接线）；无新 StreamEvent。 */
export function getLastRepoMapOccupancy(): RepoMapOccupancy | null {
  return lastOccupancy
}

export function resetLastRepoMapOccupancyForTests(): void {
  lastOccupancy = null
}

export { clearRepoMapParseCache }

export async function buildRepoMap(
  listDir: ListDirFn,
  readFile: ReadFileFn,
  options?: BuildRepoMapOptions
): Promise<BuildRepoMapResult> {
  const tokenBudget = options?.tokenBudget ?? REPO_MAP_TOKEN_BUDGET
  ensureParseCacheWorkspace(options?.workspaceRoot ?? null)

  const { outline, sourceFiles } = await collectOutlineAndSources(listDir, {
    maxDepth: options?.maxDepth
  })

  if (options?.forceDirectoryMode) {
    return finishDirectory(outline, tokenBudget, options, "remote-or-forced")
  }

  const ready = await ensureWasmReady(options?.wasm)
  if (!ready) {
    return finishDirectory(outline, tokenBudget, options, "wasm-init-failed")
  }

  const extractFn = options?.extractSignaturesFn ?? extractSignatures
  const getMtime = options?.getMtimeMs ?? defaultGetMtimeMs(options?.workspaceRoot)
  const sourcesByPath = new Map<string, string>()
  const mtimes = new Map<string, number>()
  const files: FileSymbols[] = []

  for (const path of sourceFiles) {
    const grammar = grammarForPath(path)
    if (!grammar) {
      files.push({ path, signatures: [] })
      continue
    }
    let source = ""
    try {
      source = await readFile(path)
    } catch {
      files.push({ path, signatures: [] })
      continue
    }
    sourcesByPath.set(path, source)
    if (source.length > REPO_MAP_MAX_FILE_CHARS) {
      files.push({ path, signatures: [] })
      continue
    }

    const mtimeMs = (await getMtime(path).catch(() => null)) ?? 0
    if (mtimeMs > 0) mtimes.set(path, mtimeMs)
    const cacheKey = makeParseCacheKey(path, mtimeMs, grammar)
    const cached = mtimeMs > 0 ? getCachedSignatures(cacheKey) : undefined
    if (cached) {
      files.push({ path, signatures: cached.signatures })
      continue
    }

    try {
      const signatures = (await extractFn(source, grammar, options?.wasm)) ?? []
      files.push({ path, signatures })
      if (mtimeMs > 0) {
        setCachedSignatures(cacheKey, {
          signatures,
          mtimeMs,
          grammarId: grammar,
          grammarVersion: GRAMMAR_VERSION
        })
      }
    } catch {
      files.push({ path, signatures: [] })
    }
  }

  const recentChangeScores = await resolveRecentChangeScores(
    sourceFiles,
    mtimes,
    options
  )
  const ranked = rankByRelevance(files, { sourcesByPath, recentChangeScores })
  // 目录骨架仍作 directory mode 兜底；symbol 输出保持符号头（A 行为），排序后再 format。
  const formatted = formatSymbolMap(ranked, { tokenBudget })
  const occupancy: RepoMapOccupancy = {
    mode: "symbol",
    chars: formatted.text.length,
    approxTokens: formatted.approxTokens,
    tokenBudget
  }
  publishOccupancy(occupancy, options)
  return {
    outline: formatted.text,
    mode: "symbol",
    count: files.length,
    occupancy
  }
}

async function resolveRecentChangeScores(
  paths: readonly string[],
  mtimes: Map<string, number>,
  options: BuildRepoMapOptions | undefined
): Promise<Map<string, number>> {
  if (options?.recentChangeScores) {
    if (options.recentChangeScores instanceof Map) {
      return new Map(options.recentChangeScores)
    }
    return new Map(Object.entries(options.recentChangeScores))
  }
  const loader =
    options?.loadRecentChangeScores ??
    (options?.workspaceRoot
      ? createGitRecentChangeLoader(options.workspaceRoot)
      : undefined)
  if (loader) {
    const fromGit = await loader(paths)
    if (fromGit.size > 0) return fromGit
  }
  // 无 git 信号时退 mtime 弱排序。
  if (mtimes.size > 0) return mtimeChangeScores(mtimes)
  return new Map()
}

function defaultGetMtimeMs(
  workspaceRoot: string | undefined
): (relativePath: string) => Promise<number | null> {
  if (!workspaceRoot) {
    return async () => null
  }
  return async (relativePath: string) => {
    const abs = join(workspaceRoot, relativePath)
    const info = await stat(abs)
    return info.mtimeMs
  }
}

function finishDirectory(
  outline: Awaited<ReturnType<typeof collectOutlineAndSources>>["outline"],
  tokenBudget: number,
  options: BuildRepoMapOptions | undefined,
  _reason: string
): BuildRepoMapResult {
  const body = formatRepoOutline(outline)
  const text = `${directoryModeBanner()}\n${body}`
  const occupancy: RepoMapOccupancy = {
    mode: "directory",
    chars: text.length,
    approxTokens: Math.ceil(text.length / 4),
    tokenBudget,
    note: SYMBOL_MAP_UNAVAILABLE_NOTE
  }
  publishOccupancy(occupancy, options)
  return {
    outline: text,
    mode: "directory",
    count: outline.length,
    occupancy
  }
}

function publishOccupancy(occupancy: RepoMapOccupancy, options?: BuildRepoMapOptions): void {
  lastOccupancy = occupancy
  options?.onOccupancy?.(occupancy)
}
