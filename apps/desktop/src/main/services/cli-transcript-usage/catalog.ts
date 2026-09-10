/**
 * 本机记录扫描目录：谁扫、扫什么、根在哪。unsupported 源 scan=none，不碰盘。
 */
import { join } from "node:path"
import type { CliUsageSourceId } from "@enjoy-agents/ipc-contract"

const CATALOG_IDS = [
  "claude",
  "cursor",
  "grok",
  "codex",
  "antigravity",
  "gemini",
  "opencode",
  "pi",
  "hermes",
  "amp",
  "deepseek",
  "omp"
] as const satisfies readonly CliUsageSourceId[]

export type CliUsageScanMode = "none" | "jsonl" | "usage-json"

export type CliUsageCatalogEntry = {
  id: CliUsageSourceId
  scan: CliUsageScanMode
  roots: (home: string) => string[]
}

const JSONL_NONE: CliUsageScanMode = "none"

export function catalogEntry(id: CliUsageSourceId): CliUsageCatalogEntry {
  if (id === "claude") {
    return {
      id,
      scan: "jsonl",
      roots: (home) => [join(home, ".claude", "projects")]
    }
  }
  if (id === "codex") {
    return {
      id,
      scan: "jsonl",
      roots: (home) => [join(home, ".codex", "sessions"), join(home, ".codex", "archived_sessions")]
    }
  }
  if (id === "grok") {
    return {
      id,
      scan: "usage-json",
      roots: (home) => [join(home, ".grok", "sessions")]
    }
  }
  return { id, scan: JSONL_NONE, roots: () => [] }
}

export function catalogIds(): readonly CliUsageSourceId[] {
  return CATALOG_IDS
}
