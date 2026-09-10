/**
 * Codex jsonl adapter 壳：任意深度 *.jsonl。
 */
import type { CliUsageAdapter } from "./types.ts"
import { matchJsonlRelPath } from "./types.ts"
import { catalogEntry } from "../catalog.ts"
import { parseCodexTranscript } from "../parsers/parse-codex.ts"

export const codexAdapter: CliUsageAdapter = {
  id: "codex",
  roots: (home) => catalogEntry("codex").roots(home),
  matchRelPath: matchJsonlRelPath,
  parse: (text) => parseCodexTranscript(text)
}
