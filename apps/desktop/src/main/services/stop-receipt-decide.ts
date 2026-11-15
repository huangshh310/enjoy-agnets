/**
 * StopReceipt 纯判定（leo arch §5.2）：fail-closed，表驱动单测。
 * 文件快照 / mtime / git status 不得升级成 none_confirmed。
 */
import type {
  StopEvidence,
  StopProcessExit,
  StopReceipt,
  StopReceiptTool,
  StopTreeCertainty,
  StopWriteVerdict
} from "@enjoy-agents/ipc-contract"

export type ReceiptLedgerPhase = "blocked_before_start" | "started" | "spawned" | "settled"

export type ReceiptLedgerOutcome = "ok" | "error" | "exited" | "killed" | "unconfirmed"

export type ReceiptLedgerOp =
  | "write_file"
  | "edit_file"
  | "code_mode_script"
  | "bash"
  | "git_commit"
  | "git_branch"
  | "git_push"
  | "mcp"
  | "stub_write"

export type ReceiptLedgerEntry = {
  id: string
  runId: string
  toolCallId?: string
  op: ReceiptLedgerOp | string
  phase: ReceiptLedgerPhase | string
  outcome?: ReceiptLedgerOutcome | string
  pid?: number
  startedAt: number
  settledAt?: number
  deadlineAt: number
  tree?: StopTreeCertainty
  /** SSH / MCP 一旦开始即不可验证。 */
  external?: "ssh" | "mcp"
}

export type ReceiptKnownTool = {
  toolCallId: string
  name: string
  /** 当时还在审批中 / 未批准，账本没有条目时记 never_reached_executor。 */
  pendingApproval?: boolean
}

export type DecideStopReceiptInput = {
  entries: readonly ReceiptLedgerEntry[]
  knownTools?: readonly ReceiptKnownTool[]
  phase?: "stuck" | "settled" | "final"
  now?: number
  abortAt?: number
  tree?: StopTreeCertainty
}

const PROCESS_OPS = new Set(["bash", "git_push"])
const ATOMIC_WRITE_OPS = new Set(["write_file", "edit_file", "code_mode_script", "git_commit", "git_branch", "stub_write"])

function isProcessOp(op: string): boolean {
  return PROCESS_OPS.has(op)
}

function isAtomicWriteOp(op: string): boolean {
  return ATOMIC_WRITE_OPS.has(op)
}

function toolNameOf(op: string): string {
  if (op === "code_mode_script") return "code_mode"
  return op
}

function unique(values: StopEvidence[]): StopEvidence[] {
  return [...new Set(values)]
}

function aggregateWrites(writes: StopWriteVerdict[]): StopWriteVerdict {
  if (writes.some((item) => item === "maybe_partial")) return "maybe_partial"
  if (writes.some((item) => item === "completed")) return "completed"
  return "none_confirmed"
}

function classifyEntry(
  entry: ReceiptLedgerEntry,
  phase: "stuck" | "settled" | "final"
): { write: StopWriteVerdict; evidence: StopEvidence[]; exit?: StopProcessExit } {
  const evidence: StopEvidence[] = []
  const unsettled = entry.phase !== "settled" && entry.phase !== "blocked_before_start"
  if (phase === "stuck" && unsettled) {
    evidence.push("process_unconfirmed")
    if (entry.external) evidence.push("external_unverifiable")
    return {
      write: "maybe_partial",
      evidence: unique(evidence),
      exit: isProcessOp(entry.op) || entry.phase === "spawned" ? "unconfirmed" : undefined
    }
  }

  if (entry.phase === "blocked_before_start") {
    return { write: "none_confirmed", evidence: ["gate_blocked_before_start"] }
  }

  // 坏字段 / 未知 op：fail-closed。
  if (!entry.op || (entry.phase !== "started" && entry.phase !== "spawned" && entry.phase !== "settled")) {
    evidence.push("deadline_reached")
    return { write: "maybe_partial", evidence, exit: isProcessOp(entry.op) ? "unconfirmed" : undefined }
  }

  if (entry.external || entry.op === "mcp") {
    evidence.push("external_unverifiable")
    if (entry.outcome === "unconfirmed") evidence.push("process_unconfirmed")
    return { write: "maybe_partial", evidence: unique(evidence) }
  }

  if (isProcessOp(entry.op) || entry.phase === "spawned") {
    // 只要 spawn 过，一律 maybe_partial（无法证明被杀前没写过）。
    const exit: StopProcessExit =
      entry.outcome === "killed" ? "killed" : entry.outcome === "exited" ? "exited" : "unconfirmed"
    if (exit === "killed") evidence.push("process_killed")
    else if (exit === "exited") evidence.push("process_exited")
    else evidence.push("process_unconfirmed")
    if (entry.outcome === "unconfirmed") evidence.push("deadline_reached")
    return { write: "maybe_partial", evidence: unique(evidence), exit }
  }

  if (isAtomicWriteOp(entry.op)) {
    if (entry.phase === "settled" && entry.outcome === "ok") {
      return { write: "completed", evidence: ["fs_write_ok"] }
    }
    if (entry.phase === "settled" && entry.outcome === "error") {
      return { write: "maybe_partial", evidence: ["fs_write_error"] }
    }
    evidence.push(entry.outcome === "unconfirmed" ? "process_unconfirmed" : "fs_write_error")
    if (entry.outcome === "unconfirmed") evidence.push("deadline_reached")
    return { write: "maybe_partial", evidence: unique(evidence) }
  }

  // 未知 op：fail-closed。
  return { write: "maybe_partial", evidence: ["external_unverifiable"] }
}

function groupEntries(entries: readonly ReceiptLedgerEntry[]): Map<string, ReceiptLedgerEntry[]> {
  const groups = new Map<string, ReceiptLedgerEntry[]>()
  for (const entry of entries) {
    const key = entry.toolCallId?.trim() || entry.id
    const list = groups.get(key) ?? []
    list.push(entry)
    groups.set(key, list)
  }
  return groups
}

/**
 * 按 §5.2 七条规则生成回执。缺账本、字段坏、对不上 toolCallId 一律 maybe_partial。
 */
export function decideStopReceipt(input: DecideStopReceiptInput): StopReceipt {
  const phase = input.phase ?? "settled"
  const now = input.now ?? Date.now()
  const tools: StopReceiptTool[] = []
  const seen = new Set<string>()
  const groups = groupEntries(input.entries)

  for (const known of input.knownTools ?? []) {
    const id = known.toolCallId.trim()
    if (!id) {
      tools.push({
        toolCallId: "unknown",
        name: known.name || "unknown",
        write: "maybe_partial",
        evidence: ["external_unverifiable"]
      })
      continue
    }
    seen.add(id)
    const entries = groups.get(id) ?? []
    if (entries.length === 0) {
      if (known.pendingApproval) {
        tools.push({
          toolCallId: id,
          name: known.name,
          write: "none_confirmed",
          evidence: ["never_reached_executor"]
        })
      } else {
        // 账本缺失或对不上：fail-closed。
        tools.push({
          toolCallId: id,
          name: known.name,
          write: "maybe_partial",
          evidence: ["process_unconfirmed"]
        })
      }
      continue
    }
    tools.push(toolFromEntries(id, known.name, entries, phase))
  }

  for (const [id, entries] of groups) {
    if (seen.has(id)) continue
    tools.push(toolFromEntries(id, toolNameOf(entries[0]?.op ?? "unknown"), entries, phase))
  }

  const tree =
    input.tree ??
    input.entries.map((item) => item.tree).find((item): item is StopTreeCertainty => item === "confirmed" || item === "best_effort")

  const startedAt = input.entries.reduce((min, entry) => Math.min(min, entry.startedAt), Number.POSITIVE_INFINITY)
  const settledAt = input.entries.reduce((max, entry) => Math.max(max, entry.settledAt ?? 0), 0) || now
  const origin = Number.isFinite(startedAt) ? startedAt : (input.abortAt ?? now)

  return {
    write: aggregateWrites(tools.map((item) => item.write)),
    tools,
    settledAt,
    elapsedMs: Math.max(0, settledAt - (input.abortAt ?? origin)),
    ...(tree ? { tree } : {})
  }
}

function toolFromEntries(
  toolCallId: string,
  fallbackName: string,
  entries: readonly ReceiptLedgerEntry[],
  phase: "stuck" | "settled" | "final"
): StopReceiptTool {
  const classified = entries.map((entry) => classifyEntry(entry, phase))
  const write = aggregateWrites(classified.map((item) => item.write))
  const evidence = unique(classified.flatMap((item) => item.evidence))
  const exits = classified.map((item) => item.exit).filter((item): item is StopProcessExit => Boolean(item))
  const exit: StopProcessExit | undefined = exits.includes("unconfirmed")
    ? "unconfirmed"
    : exits.includes("killed")
      ? "killed"
      : exits[0]
  const name = fallbackName || toolNameOf(entries[0]?.op ?? "unknown")
  return { toolCallId, name, write, evidence, ...(exit ? { exit } : {}) }
}
