/**
 * repo_outline 符号地图编排：wasm 成功 → 签名；失败 / 远程 → 目录模式。
 */
import { formatRepoOutline, type ListDirFn } from "../repo-outline.ts"
import { REPO_MAP_MAX_FILE_CHARS, REPO_MAP_TOKEN_BUDGET } from "./budgets.ts"
import { collectOutlineAndSources } from "./collect-sources.ts"
import { directoryModeBanner, SYMBOL_MAP_UNAVAILABLE_NOTE } from "./degrade.ts"
import { formatSymbolMap, type FileSymbols } from "./format-symbol-map.ts"
import { grammarForPath } from "./languages.ts"
import { extractSignatures } from "./signatures.ts"
import { ensureWasmReady, type WasmHostOptions } from "./wasm-host.ts"

export type ReadFileFn = (relativePath: string) => Promise<string>

export type BuildRepoMapOptions = {
  maxDepth?: number
  tokenBudget?: number
  /** SSH / 非本地 / 单测强制目录模式。 */
  forceDirectoryMode?: boolean
  wasm?: WasmHostOptions
  /** 最近一次占用，供 Inspect 接线（PR C）；本 PR 只维护数值。 */
  onOccupancy?: (info: RepoMapOccupancy) => void
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

export async function buildRepoMap(
  listDir: ListDirFn,
  readFile: ReadFileFn,
  options?: BuildRepoMapOptions
): Promise<BuildRepoMapResult> {
  const tokenBudget = options?.tokenBudget ?? REPO_MAP_TOKEN_BUDGET
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
    if (source.length > REPO_MAP_MAX_FILE_CHARS) {
      files.push({ path, signatures: [] })
      continue
    }
    try {
      const signatures = await extractSignatures(source, grammar, options?.wasm)
      // grammar miss / 解析失败 → 仅路径行，不整仓失败。
      files.push({ path, signatures: signatures ?? [] })
    } catch {
      files.push({ path, signatures: [] })
    }
  }

  const formatted = formatSymbolMap(files, { tokenBudget })
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
