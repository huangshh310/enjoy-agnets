/**
 * 从本轮助手工具收成只读账本。用量只在调用方传入真实 token 时追加。
 * TODO: 耐久 run_steps IPC 未接线；先吃内存 transcript，不编造耗时。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import { collapseLedgerEntries } from "./collapse-ledger-entries.ts"
import { entryFromTool } from "./format-ledger-entry.ts"
import { LEDGER_GROUPS, type RunLedgerEntry, type RunLedgerGroup } from "./run-ledger.types.ts"

export function lastAssistantTurn(messages: readonly ThreadMessage[]): ThreadMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === "assistant") return message
  }
  return null
}

export function collectRunLedger(
  message: Pick<ThreadMessage, "tools" | "id"> | null,
  usageTokens?: number
): RunLedgerEntry[] {
  if (!message) return usageRow(usageTokens)
  const rows: RunLedgerEntry[] = []
  for (const tool of message.tools ?? []) {
    const entry = entryFromTool(tool)
    if (entry) rows.push(entry)
  }
  return [...collapseLedgerEntries(rows), ...usageRow(usageTokens)]
}

export function groupRunLedger(entries: readonly RunLedgerEntry[]): {
  groups: RunLedgerGroup[]
  usage: RunLedgerEntry | null
} {
  const usage = entries.find((entry) => entry.kind === "usage") ?? null
  const groups = LEDGER_GROUPS.flatMap((kind) => {
    const items = entries.filter((entry) => entry.kind === kind)
    return items.length > 0 ? [{ kind, entries: items }] : []
  })
  return { groups, usage }
}

function usageRow(usageTokens?: number): RunLedgerEntry[] {
  if (usageTokens == null || usageTokens <= 0) return []
  return [
    {
      id: "ledger:usage",
      kind: "usage",
      title: String(usageTokens)
    }
  ]
}
