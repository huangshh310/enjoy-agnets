/**
 * 同一文件既读又改时只留改；同组同 path 去重。命令/错误不合并。
 */
import type { RunLedgerEntry } from "./run-ledger.types"

export function collapseLedgerEntries(entries: readonly RunLedgerEntry[]): RunLedgerEntry[] {
  const edited = new Set(
    entries.filter((entry) => entry.kind === "edit" && entry.path).map((entry) => entry.path as string)
  )
  const withoutCoveredReads = entries.filter(
    (entry) => !(entry.kind === "read" && entry.path && edited.has(entry.path))
  )
  const seen = new Set<string>()
  const next: RunLedgerEntry[] = []
  for (const entry of withoutCoveredReads) {
    if (entry.kind !== "read" && entry.kind !== "edit") {
      next.push(entry)
      continue
    }
    const key = `${entry.kind}:${entry.path || entry.id}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(entry)
  }
  return next
}
