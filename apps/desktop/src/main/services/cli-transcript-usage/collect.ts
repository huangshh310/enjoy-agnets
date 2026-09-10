/**
 * 编排 catalog × adapter → CliTranscriptUsage。不写路径特例。
 */
import { existsSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import type { CliTranscriptUsage, CliUsageSource, CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { claudeAdapter } from "./adapters/claude.ts"
import { codexAdapter } from "./adapters/codex.ts"
import { grokAdapter } from "./adapters/grok.ts"
import type { CliUsageAdapter } from "./adapters/types.ts"
import { catalogEntry, catalogIds } from "./catalog.ts"
import {
  MAX_TRANSCRIPT_BYTES,
  MAX_TRANSCRIPT_FILES,
  MAX_USAGE_JSON_BYTES,
  MAX_USAGE_JSON_FILES
} from "./constants.ts"
import { hasAnyTokens, type UsageDelta } from "./parsers/parse-usage.ts"
import { rollupBuckets, rollupProjects, sumCostTicks, sumTokenFields } from "./rollup.ts"
import { sourceStatus } from "./source-status.ts"
import { walkMatchingFiles } from "./walk-files.ts"

type AdapterRun = { adapter: CliUsageAdapter; maxFiles: number; maxBytes: number }

function adapterRun(id: CliUsageSourceId): AdapterRun | undefined {
  if (id === "claude") {
    return { adapter: claudeAdapter, maxFiles: MAX_TRANSCRIPT_FILES, maxBytes: MAX_TRANSCRIPT_BYTES }
  }
  if (id === "codex") {
    return { adapter: codexAdapter, maxFiles: MAX_TRANSCRIPT_FILES, maxBytes: MAX_TRANSCRIPT_BYTES }
  }
  if (id === "grok") {
    return { adapter: grokAdapter, maxFiles: MAX_USAGE_JSON_FILES, maxBytes: MAX_USAGE_JSON_BYTES }
  }
  return undefined
}

export function collectCliTranscriptUsage(
  home = homedir(),
  now = Date.now()
): CliTranscriptUsage {
  const deltas: UsageDelta[] = []
  const sources = catalogIds().map((id) => {
    const collected = collectOne(id, home)
    deltas.push(...collected.deltas)
    return collected.source
  })
  return {
    scannedAt: now,
    sources,
    days: rollupBuckets(deltas, (item) => item.day || "—"),
    models: rollupBuckets(deltas, (item) => item.model || "—"),
    projects: rollupProjects(deltas)
  }
}

function collectOne(
  id: CliUsageSourceId,
  home: string
): { source: CliUsageSource; deltas: UsageDelta[] } {
  const spec = catalogEntry(id)
  if (spec.scan === "none") return { source: unsupportedSource(id), deltas: [] }
  const run = adapterRun(id)
  if (!run) return { source: unsupportedSource(id), deltas: [] }
  return collectAdapter(run, home)
}

function collectAdapter(
  run: AdapterRun,
  home: string
): { source: CliUsageSource; deltas: UsageDelta[] } {
  const { adapter, maxFiles, maxBytes } = run
  const roots = adapter.roots(home)
  const directoryFound = roots.some((root) => existsSync(root))
  const files = walkMatchingFiles({ roots, matchRelPath: adapter.matchRelPath, maxFiles })
  const deltas: UsageDelta[] = []
  for (const file of files) {
    const parsed = readMatchedFile(file, adapter, roots, maxBytes)
    if (parsed && hasAnyTokens(parsed)) deltas.push({ ...parsed, sourceId: adapter.id })
  }
  const ticks = sumCostTicks(deltas)
  return {
    source: {
      id: adapter.id,
      status: sourceStatus({
        scan: catalogEntry(adapter.id).scan,
        directoryFound,
        sessionCount: deltas.length
      }),
      sessionCount: deltas.length,
      fileCount: files.length,
      ...sumTokenFields(deltas),
      ...(ticks ? { costUsdTicks: ticks } : {})
    },
    deltas
  }
}

function readMatchedFile(
  file: string,
  adapter: CliUsageAdapter,
  roots: string[],
  maxBytes: number
): UsageDelta | null {
  try {
    const size = statSync(file).size
    if (size <= 0 || size > maxBytes) return null
    const root = roots.find((item) => file.startsWith(item)) ?? roots[0] ?? ""
    return adapter.parse(readFileSync(file, "utf8"), { filePath: file, root })
  } catch {
    return null
  }
}

function unsupportedSource(id: CliUsageSourceId): CliUsageSource {
  return {
    id,
    status: "unsupported",
    sessionCount: 0,
    fileCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0
  }
}
