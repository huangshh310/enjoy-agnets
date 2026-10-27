/**
 * 从本轮助手工具收成只读账本。用量只在调用方传入真实 token 时追加。
 * TODO: 耐久 run_steps IPC 未接线；先吃内存 transcript，不编造耗时。
 */
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import { collapseLedgerEntries } from "./collapse-ledger-entries.ts"
import { entryFromTool } from "./format-ledger-entry.ts"
import { LEDGER_GROUPS, type RunLedgerEntry, type RunLedgerGroup } from "./run-ledger.types.ts"

export function lastAssistantTurn(messages: readonly ThreadMessage[]): ThreadMessage | null {
  let last: ThreadMessage | null = null
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== "assistant") continue
    if (!last) last = message
    if ((message.tools?.length ?? 0) > 0) return message
  }
  return last
}

const COMMAND_LEDGER_CAP = 8

export function visibleLedgerEntries(entries: readonly RunLedgerEntry[]): RunLedgerEntry[] {
  const commands = entries.filter((entry) => entry.kind === "command")
  if (commands.length <= COMMAND_LEDGER_CAP) return [...entries]
  const failed = commands.filter((entry) => entry.failed)
  const ok = commands.filter((entry) => !entry.failed)
  const room = Math.max(0, COMMAND_LEDGER_CAP - failed.length)
  const keepOk = ok.slice(Math.max(0, ok.length - room))
  const keep = new Set([...failed, ...keepOk])
  return entries.filter((entry) => entry.kind !== "command" || keep.has(entry))
}

export type CollectRunLedgerUsage = {
  tokens?: number
  estimatedCost?: RunLedgerEntry["estimatedCost"]
  costEngineLabel?: string
}

export function collectRunLedger(
  message: Pick<ThreadMessage, "tools" | "id"> | null,
  usage?: number | CollectRunLedgerUsage
): RunLedgerEntry[] {
  const bag: CollectRunLedgerUsage =
    typeof usage === "number" ? { tokens: usage } : (usage ?? {})
  if (!message) return usageRow(bag)
  const rows: RunLedgerEntry[] = []
  for (const tool of message.tools ?? []) {
    const entry = entryFromTool(tool)
    if (entry) rows.push(entry)
  }
  return [...collapseLedgerEntries(rows), ...usageRow(bag)]
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

function usageRow(usage: CollectRunLedgerUsage): RunLedgerEntry[] {
  const usageTokens = usage.tokens
  if (usageTokens == null || usageTokens <= 0) return []
  return [
    {
      id: "ledger:usage",
      kind: "usage",
      title: String(usageTokens),
      ...(usage.estimatedCost ? { estimatedCost: usage.estimatedCost } : {}),
      ...(usage.costEngineLabel ? { costEngineLabel: usage.costEngineLabel } : {})
    }
  ]
}
