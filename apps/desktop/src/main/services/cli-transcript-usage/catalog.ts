/**
 * 本机记录扫描目录：导轨 12 个 CLI 都扫盘。没有用量字段就是 scanned-empty，不是 unsupported。
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

export function catalogEntry(id: CliUsageSourceId): CliUsageCatalogEntry {
  return {
    id,
    scan: id === "grok" ? "usage-json" : "jsonl",
    roots: (home) => catalogRoots(id, home)
  }
}

export function catalogIds(): readonly CliUsageSourceId[] {
  return CATALOG_IDS
}

function catalogRoots(id: CliUsageSourceId, home: string): string[] {
  if (id === "claude") return [join(home, ".claude", "projects")]
  if (id === "codex") return [join(home, ".codex", "sessions"), join(home, ".codex", "archived_sessions")]
  if (id === "grok") return [join(home, ".grok", "sessions")]
  if (id === "cursor") return [join(home, ".cursor", "projects")]
  if (id === "antigravity") {
    return [
      join(home, ".gemini", "antigravity"),
      join(home, ".gemini", "antigravity-cli"),
      join(home, ".gemini", "antigravity-ide")
    ]
  }
  if (id === "gemini") return [join(home, ".gemini", "config")]
  if (id === "opencode") {
    return [join(home, ".local", "share", "opencode"), join(home, ".config", "opencode"), join(home, ".opencode")]
  }
  if (id === "pi") return [join(home, ".pi"), join(home, ".pi-acp")]
  if (id === "hermes") return [join(home, ".hermes")]
  if (id === "amp") {
    return [join(home, ".local", "share", "amp"), join(home, ".config", "amp"), join(home, ".amp")]
  }
  if (id === "deepseek") return [join(home, ".dsh")]
  return [join(home, ".omp", "agent", "sessions")]
}
