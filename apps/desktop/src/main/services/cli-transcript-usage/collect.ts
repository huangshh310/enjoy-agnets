/**
 * 扫描本机 Claude / Codex jsonl，聚合成日 / 模型 / 项目桶。不回传路径或原文。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { CliTranscriptUsage, CliUsageBucket, CliUsageSource } from "@enjoy-agents/ipc-contract"
import { MAX_PROJECT_BUCKETS, MAX_TRANSCRIPT_BYTES, MAX_TRANSCRIPT_FILES } from "./constants.ts"
import { parseClaudeTranscript } from "./parse-claude.ts"
import { parseCodexTranscript } from "./parse-codex.ts"
import type { UsageDelta } from "./parse-usage.ts"

type SourceId = "claude" | "codex"

export function transcriptRoots(home: string): Record<SourceId, string[]> {
  return {
    claude: [join(home, ".claude", "projects")],
    codex: [join(home, ".codex", "sessions"), join(home, ".codex", "archived_sessions")]
  }
}

export function collectCliTranscriptUsage(
  home = homedir(),
  now = Date.now()
): CliTranscriptUsage {
  const roots = transcriptRoots(home)
  const claude = collectSource("claude", roots.claude, parseClaudeTranscript)
  const codex = collectSource("codex", roots.codex, parseCodexTranscript)
  const sessions = [...claude.deltas, ...codex.deltas]
  return {
    scannedAt: now,
    sources: [claude.source, codex.source],
    days: rollup(sessions, (item) => item.day || "—"),
    models: rollup(sessions, (item) => item.model || "—"),
    projects: rollup(sessions, (item) => item.project || "—").slice(0, MAX_PROJECT_BUCKETS)
  }
}

function collectSource(
  id: SourceId,
  roots: string[],
  parse: (text: string) => UsageDelta
): { source: CliUsageSource; deltas: UsageDelta[] } {
  const files = listJsonl(roots).slice(0, MAX_TRANSCRIPT_FILES)
  const found = roots.some((root) => existsSync(root))
  const deltas: UsageDelta[] = []
  for (const file of files) {
    const delta = readTranscript(file, parse)
    if (delta && delta.totalTokens + delta.inputTokens + delta.outputTokens + delta.cacheTokens > 0) {
      deltas.push(delta)
    }
  }
  return {
    source: { id, found, sessionCount: deltas.length },
    deltas
  }
}

function readTranscript(file: string, parse: (text: string) => UsageDelta): UsageDelta | null {
  try {
    const size = statSync(file).size
    if (size <= 0 || size > MAX_TRANSCRIPT_BYTES) return null
    return parse(readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

function listJsonl(roots: string[]): string[] {
  const out: string[] = []
  for (const root of roots) walkJsonl(root, out)
  return out
}

function walkJsonl(dir: string, out: string[]): void {
  if (out.length >= MAX_TRANSCRIPT_FILES || !existsSync(dir)) return
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (out.length >= MAX_TRANSCRIPT_FILES) return
    const full = join(dir, name)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      walkJsonl(full, out)
      continue
    }
    if (stat.isFile() && name.endsWith(".jsonl")) out.push(full)
  }
}

function rollup(items: UsageDelta[], keyOf: (item: UsageDelta) => string): CliUsageBucket[] {
  const map = new Map<string, CliUsageBucket>()
  for (const item of items) {
    const key = keyOf(item)
    const prev = map.get(key) ?? {
      key,
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      totalTokens: 0,
      sessions: 0
    }
    map.set(key, {
      key,
      inputTokens: prev.inputTokens + item.inputTokens,
      outputTokens: prev.outputTokens + item.outputTokens,
      cacheTokens: prev.cacheTokens + item.cacheTokens,
      totalTokens: prev.totalTokens + item.totalTokens,
      sessions: prev.sessions + 1
    })
  }
  return [...map.values()].sort((left, right) => right.totalTokens - left.totalTokens || right.sessions - left.sessions)
}
