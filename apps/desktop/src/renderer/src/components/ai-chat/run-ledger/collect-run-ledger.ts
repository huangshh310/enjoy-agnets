/**
 * 从本轮助手工具收成只读账本。用量只在调用方传入真实 token 时追加。
 * TODO: 耐久 run_steps IPC 未接线；先吃内存 transcript，不编造耗时。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store.types"
import { extractToolPath } from "../thread/thinking/extract-step-fields.ts"
import type { RunLedgerEntry, RunLedgerKind } from "./run-ledger.types"

const COMMAND_NAMES = /^(bash|command|cmd|argv|shell)$/

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
    rows.push(entryFromTool(tool))
  }
  return [...rows, ...usageRow(usageTokens)]
}

function usageRow(usageTokens?: number): RunLedgerEntry[] {
  if (usageTokens == null || usageTokens <= 0) return []
  return [
    {
      id: "ledger:usage",
      kind: "usage",
      title: "usage",
      detail: String(usageTokens)
    }
  ]
}

function entryFromTool(tool: ThreadToolCall): RunLedgerEntry {
  const failed = tool.state === "output-error" || Boolean(tool.errorText)
  const kind = kindFromTool(tool, failed)
  const path = extractToolPath(asRecord(tool.args), tool.name, asRecord(tool.result))
  return {
    id: `ledger:${tool.id}`,
    kind,
    title: path || commandTitle(tool) || tool.name,
    detail: tool.errorText?.trim() || undefined,
    sourceChipId: path ? `file:${path}` : undefined,
    failed
  }
}

function kindFromTool(tool: ThreadToolCall, failed: boolean): RunLedgerKind {
  if (failed) return "error"
  const name = tool.name.trim().toLowerCase().replace(/[\s-]/g, "_")
  if (COMMAND_NAMES.test(name) || name.includes("bash")) return "command"
  return "tool"
}

function commandTitle(tool: ThreadToolCall): string | null {
  const args = asRecord(tool.args)
  const command = args.command ?? args.cmd ?? args.script
  return typeof command === "string" && command.trim() ? `$ ${command.trim()}` : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
