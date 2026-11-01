/**
 * 启发式相关度：仓内引用粗估 + 近期改动加权。不做 LSP / 精确引用图。
 */
import type { FileSymbols } from "./format-symbol-map.ts"

/** 引用分权重（可配置）。 */
export const REPO_MAP_REF_WEIGHT = 3
/** 近期改动分权重（可配置）。 */
export const REPO_MAP_CHANGE_WEIGHT = 2

export type ScoredFileSymbols = FileSymbols & {
  score: number
  refScore: number
  changeScore: number
}

export type RankByRelevanceOptions = {
  /** path → 源码文本（已读到的）；缺省则只靠签名标识符互相比对。 */
  sourcesByPath?: ReadonlyMap<string, string> | Record<string, string>
  /** path → 近期改动分（git 提交次数等）。 */
  recentChangeScores?: ReadonlyMap<string, number> | Record<string, number>
  refWeight?: number
  changeWeight?: number
}

/**
 * 对 FileSymbols[] 打分并降序排序（同分按 path 升序稳定）。
 * 引用粗估：把各文件签名里的标识符拿到其它文件源码/签名里做词边界计数。
 */
export function rankByRelevance(
  files: readonly FileSymbols[],
  options?: RankByRelevanceOptions
): ScoredFileSymbols[] {
  const refWeight = options?.refWeight ?? REPO_MAP_REF_WEIGHT
  const changeWeight = options?.changeWeight ?? REPO_MAP_CHANGE_WEIGHT
  const sources = toMap(options?.sourcesByPath)
  const changes = toNumberMap(options?.recentChangeScores)

  const identsByPath = new Map<string, string[]>()
  for (const file of files) {
    identsByPath.set(file.path, identifiersFromSignatures(file.signatures))
  }

  // 预拼「他文件」语料，避免 O(n²) 重复 join。
  const corpusByPath = new Map<string, string>()
  for (const file of files) {
    const source = sources.get(file.path) ?? ""
    const sigBlob = file.signatures.join("\n")
    corpusByPath.set(file.path, `${source}\n${sigBlob}`)
  }

  const scored: ScoredFileSymbols[] = files.map((file) => {
    const idents = identsByPath.get(file.path) ?? []
    let refScore = 0
    for (const other of files) {
      if (other.path === file.path) continue
      const corpus = corpusByPath.get(other.path) ?? ""
      if (!corpus) continue
      for (const ident of idents) {
        refScore += countWordMatches(corpus, ident)
      }
    }
    const changeScore = changes.get(file.path) ?? 0
    const score = refScore * refWeight + changeScore * changeWeight
    return { ...file, score, refScore, changeScore }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.path.localeCompare(b.path)
  })
  return scored
}

/** 从签名行抽标识符（function/class/type/const/enum/interface 名）。 */
export function identifiersFromSignatures(signatures: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const sig of signatures) {
    for (const ident of identifiersFromOneSignature(sig)) {
      if (seen.has(ident)) continue
      seen.add(ident)
      out.push(ident)
    }
  }
  return out
}

function identifiersFromOneSignature(sig: string): string[] {
  const patterns = [
    /\b(?:async\s+)?function\s+\*?\s*([A-Za-z_$][\w$]*)/,
    /\b(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,
    /\binterface\s+([A-Za-z_$][\w$]*)/,
    /\btype\s+([A-Za-z_$][\w$]*)/,
    /\benum\s+([A-Za-z_$][\w$]*)/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/,
    /\b(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const)\s+/
  ]
  const found: string[] = []
  for (const re of patterns.slice(0, 6)) {
    const m = sig.match(re)
    if (m?.[1] && m[1].length >= 2) found.push(m[1])
  }
  // 兜底：导出名后的首个标识符
  if (found.length === 0) {
    const m = sig.match(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|type|interface|enum|const|let)\s+([A-Za-z_$][\w$]*)/)
    if (m?.[1] && m[1].length >= 2) found.push(m[1])
  }
  return found
}

export function countWordMatches(haystack: string, ident: string): number {
  if (!ident || ident.length < 2) return 0
  const re = new RegExp(`\\b${escapeRegExp(ident)}\\b`, "g")
  const matches = haystack.match(re)
  return matches?.length ?? 0
}

/**
 * 解析 `git log --name-only --pretty=format:` 类输出为 path → 出现次数。
 * 只统计 paths 集合内的相对路径。
 */
export function scoresFromNameOnlyLog(
  logStdout: string,
  paths: readonly string[]
): Map<string, number> {
  const wanted = new Set(paths.map((p) => p.replace(/\\/g, "/")))
  const scores = new Map<string, number>()
  for (const rawLine of logStdout.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/\\/g, "/")
    if (!line || line.startsWith("commit ")) continue
    if (!wanted.has(line)) continue
    scores.set(line, (scores.get(line) ?? 0) + 1)
  }
  return scores
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function toMap(input?: ReadonlyMap<string, string> | Record<string, string>): Map<string, string> {
  if (!input) return new Map()
  if (input instanceof Map) return new Map(input)
  return new Map(Object.entries(input))
}

function toNumberMap(
  input?: ReadonlyMap<string, number> | Record<string, number>
): Map<string, number> {
  if (!input) return new Map()
  if (input instanceof Map) return new Map(input)
  return new Map(Object.entries(input))
}
