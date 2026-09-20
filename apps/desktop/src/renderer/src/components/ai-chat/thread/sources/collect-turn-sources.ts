/**
 * 从本轮 cited sources + 工具调用收成芯片，去重。网页 URL 本轮不做。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { isLedgerFileSourceName } from "../../run-ledger/format-ledger-entry.ts"
import { extractToolPath } from "../thinking/extract-step-fields.ts"
import { classifySourceKind, formatSourceChipLabel, parseMcpServerId, type TurnSourceChip } from "./source-chip.ts"
import { isHttpSource } from "./source-path.ts"

export function collectTurnSources(
  message: Pick<ThreadMessage, "sources" | "tools">,
  skillPrefix: (name: string) => string
): TurnSourceChip[] {
  const chips: TurnSourceChip[] = []
  for (const source of message.sources ?? []) {
    if (isHttpSource(source.path) || isHttpSource(source.title)) continue
    chips.push(
      toChip(
        {
          id: source.sourceId || source.path,
          path: source.path,
          startLine: source.startLine,
          title: source.title
        },
        skillPrefix
      )
    )
  }
  for (const tool of message.tools ?? []) {
    const fromTool = chipFromTool(tool, skillPrefix)
    if (fromTool) chips.push(fromTool)
  }
  return dedupeChips(chips)
}

function chipFromTool(tool: ThreadToolCall, skillPrefix: (name: string) => string): TurnSourceChip | null {
  const serverId = parseMcpServerId(tool.name)
  if (serverId) {
    return toChip({ id: `mcp:${serverId}`, title: serverId, toolName: tool.name }, skillPrefix)
  }
  const name = tool.name.trim().toLowerCase()
  if (name === "skill") {
    const title = skillTitle(tool)
    return toChip({ id: `skill:${tool.id}`, title, toolName: "skill" }, skillPrefix)
  }
  if (!isLedgerFileSourceName(name)) return null
  const path = extractToolPath(asRecord(tool.args), tool.name, asRecord(tool.result))
  if (!path || isHttpSource(path)) return null
  return toChip({ id: `file:${path}`, path, toolName: name }, skillPrefix)
}

function toChip(
  input: {
    id: string
    path?: string
    startLine?: number
    title?: string
    toolName?: string
  },
  skillPrefix: (name: string) => string
): TurnSourceChip {
  const kind = classifySourceKind(input)
  const chip: TurnSourceChip = {
    id: input.id,
    kind,
    label: "",
    path: input.path,
    startLine: input.startLine,
    title: input.title
  }
  return { ...chip, label: formatSourceChipLabel(chip, skillPrefix) }
}

function skillTitle(tool: ThreadToolCall): string {
  const args = asRecord(tool.args)
  const raw = args.name ?? args.skill ?? args.title
  return typeof raw === "string" && raw.trim() ? raw.trim() : tool.name
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function dedupeChips(chips: readonly TurnSourceChip[]): TurnSourceChip[] {
  const byKey = new Map<string, TurnSourceChip>()
  for (const chip of chips) {
    const key = `${chip.kind}:${chip.path ?? chip.title ?? chip.id}`
    const prev = byKey.get(key)
    if (!prev || (prev.startLine == null && chip.startLine != null)) byKey.set(key, chip)
  }
  return [...byKey.values()]
}
