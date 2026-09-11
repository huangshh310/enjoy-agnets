/**
 * 按 catalog id 取 adapter。导轨 12 源都有扫描器。
 */
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"
import { claudeAdapter } from "./claude.ts"
import { codexAdapter } from "./codex.ts"
import { grokAdapter } from "./grok.ts"
import { jsonlCatalogAdapters } from "./jsonl-sources.ts"
import type { CliUsageAdapter } from "./types.ts"

const JSONL_ADAPTERS = new Map(jsonlCatalogAdapters().map((item) => [item.id, item]))

export function adapterFor(id: CliUsageSourceId): CliUsageAdapter | undefined {
  if (id === "claude") return claudeAdapter
  if (id === "codex") return codexAdapter
  if (id === "grok") return grokAdapter
  return JSONL_ADAPTERS.get(id)
}
