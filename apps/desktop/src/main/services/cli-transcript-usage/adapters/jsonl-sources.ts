/**
 * 导轨其余 jsonl 源。有 usage 就累加；没有字段则 parse 出全 0，collect 标 scanned-empty。
 */
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { catalogEntry } from "../catalog.ts"
import { parseJsonlTokenTranscript } from "../parsers/parse-jsonl-tokens.ts"
import type { CliUsageAdapter } from "./types.ts"
import { matchCursorTranscriptRelPath, matchJsonlRelPath } from "./types.ts"

const JSONL_SOURCE_IDS = [
  "cursor",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "hermes",
  "amp",
  "deepseek",
  "omp"
] as const satisfies readonly CliUsageSourceId[]

export function jsonlCatalogAdapters(): CliUsageAdapter[] {
  return JSONL_SOURCE_IDS.map((id) => ({
    id,
    roots: (home) => catalogEntry(id).roots(home),
    matchRelPath: id === "cursor" ? matchCursorTranscriptRelPath : matchJsonlRelPath,
    parse: (text) => parseJsonlTokenTranscript(text)
  }))
}
