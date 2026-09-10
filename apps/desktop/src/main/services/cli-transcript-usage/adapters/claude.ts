/**
 * Claude jsonl adapter 壳：任意深度 *.jsonl。
 */
import type { CliUsageAdapter } from "./types.ts"
import { matchJsonlRelPath } from "./types.ts"
import { catalogEntry } from "../catalog.ts"
import { parseClaudeTranscript } from "../parsers/parse-claude.ts"

export const claudeAdapter: CliUsageAdapter = {
  id: "claude",
  roots: (home) => catalogEntry("claude").roots(home),
  matchRelPath: matchJsonlRelPath,
  parse: (text) => parseClaudeTranscript(text)
}
