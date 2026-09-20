/**
 * 账本顶栏人话摘要：改/读/命令/失败各一段，不用计数药丸。
 */
import type { TranslateFn } from "@renderer/i18n"
import type { RunLedgerEntry } from "./run-ledger.types"

export type LedgerKindCounts = {
  read: number
  edit: number
  command: number
  error: number
}

export function ledgerKindCounts(entries: readonly RunLedgerEntry[]): LedgerKindCounts {
  return {
    read: countKind(entries, "read"),
    edit: countKind(entries, "edit"),
    command: countKind(entries, "command"),
    error: countKind(entries, "error")
  }
}

export function ledgerSummarySegments(
  counts: LedgerKindCounts,
  t: TranslateFn
): Array<{ text: string; warn?: boolean }> {
  const parts: Array<{ text: string; warn?: boolean }> = []
  if (counts.edit > 0) parts.push({ text: t("sessionOps.ledgerSummaryEdit", { n: counts.edit }) })
  if (counts.read > 0) parts.push({ text: t("sessionOps.ledgerSummaryRead", { n: counts.read }) })
  if (counts.command > 0) {
    parts.push({ text: t("sessionOps.ledgerSummaryCommand", { n: counts.command }) })
  }
  if (counts.error > 0) {
    parts.push({ text: t("sessionOps.ledgerSummaryError", { n: counts.error }), warn: true })
  }
  return parts
}

function countKind(entries: readonly RunLedgerEntry[], kind: keyof LedgerKindCounts): number {
  return entries.filter((entry) => entry.kind === kind).length
}
