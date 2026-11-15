/**
 * 每轮副作用账本：以 runId 为键，独立于 activeRuns；deleteActiveRun 之后仍保留。
 * settle 后按 LRU 回收，上限与 SETTLED_RUNS_CAP 对齐（200）。
 */
import type { BrowserWindow } from "electron"
import type { StopReceipt } from "@enjoy-agents/ipc-contract/stop-receipt"
import type { TurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { STOP_KILL_GRACE_MS, STOP_STUCK_AFTER_MS } from "@enjoy-agents/ipc-contract/stop-receipt"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { emitEvent, setIdleLedgerReclaimer } from "./agent-run-state"
import { persistTurnWorkflow, readSessionWorkflow, stickyTurnOutcome, turnOutcomeForRun } from "./apply-turn-outcome"
import {
  abandonTreeWait,
  forceKillTree,
  isTreeAlive,
  isWindowsLivenessPlatform,
  isWindowsPlatform
} from "./command"
import { effectiveToolTimeoutMs } from "./e2e-stub-gate"
import {
  decideStopReceipt,
  type ReceiptKnownTool,
  type ReceiptLedgerEntry,
  type ReceiptLedgerOp,
  type ReceiptLedgerOutcome
} from "./stop-receipt-decide"

export type SideEffectOp = ReceiptLedgerOp
export type SideEffectOutcome = ReceiptLedgerOutcome
export type SideEffectEntry = ReceiptLedgerEntry

const SETTLED_LEDGER_CAP = 200

let entrySeq = 0

type RekillHook = () => void

type RunLedger = {
  runId: string
  sessionId?: string
  window?: BrowserWindow
  tools: ThreadToolCall[]
  input?: RunAgentInput
  abortAt?: number
  entries: Map<string, SideEffectEntry>
  waiters: Array<() => void>
  rekillHooks: RekillHook[]
  stuckEmitted: boolean
  terminalEmitted: boolean
  archived: boolean
  settledOrder?: number
  timers: ReturnType<typeof setTimeout>[]
  knownTools: ReceiptKnownTool[]
}

const ledgers = new Map<string, RunLedger>()
let settledSeq = 0

function ledgerOf(runId: string): RunLedger {
  const existing = ledgers.get(runId)
  if (existing) return existing
  const created: RunLedger = {
    runId,
    tools: [],
    entries: new Map(),
    waiters: [],
    rekillHooks: [],
    stuckEmitted: false,
    terminalEmitted: false,
    archived: false,
    timers: [],
    knownTools: []
  }
  ledgers.set(runId, created)
  return created
}

export function hasUnsettled(runId: string): boolean {
  const ledger = ledgers.get(runId)
  if (!ledger) return false
  for (const entry of ledger.entries.values()) {
    if (entry.phase !== "settled" && entry.phase !== "blocked_before_start") return true
  }
  return false
}

export function latestDeadlineAt(runId: string): number | undefined {
  const ledger = ledgers.get(runId)
  if (!ledger || ledger.entries.size === 0) return undefined
  let max = 0
  for (const entry of ledger.entries.values()) {
    if (entry.deadlineAt > max) max = entry.deadlineAt
  }
  return max || undefined
}

export function begin(
  op: SideEffectOp,
  ctx: {
    runId: string
    toolCallId?: string
    toolTimeoutMs?: number
    external?: "ssh" | "mcp"
    now?: number
  }
): SideEffectEntry {
  const now = ctx.now ?? Date.now()
  const timeout = effectiveToolTimeoutMs(ctx.toolTimeoutMs ?? 30_000)
  const entry: SideEffectEntry = {
    id: `se_${Date.now().toString(36)}_${(entrySeq += 1).toString(36)}`,
    runId: ctx.runId,
    toolCallId: ctx.toolCallId,
    op,
    phase: "started",
    startedAt: now,
    deadlineAt: now + timeout + STOP_KILL_GRACE_MS,
    ...(ctx.external ? { external: ctx.external } : {})
  }
  const ledger = ledgerOf(ctx.runId)
  ledger.entries.set(entry.id, entry)
  return entry
}

export function spawned(id: string, pid: number): void {
  const entry = findEntry(id)
  if (!entry || entry.phase === "settled") return
  entry.phase = "spawned"
  entry.pid = pid
  entry.tree = isWindowsPlatform() ? "best_effort" : "confirmed"
}

export function settle(
  id: string,
  outcome: SideEffectOutcome,
  extra?: { tree?: SideEffectEntry["tree"] }
): void {
  const entry = findEntry(id)
  if (!entry || entry.phase === "settled") return
  entry.phase = "settled"
  entry.outcome = outcome
  entry.settledAt = Date.now()
  if (extra?.tree) entry.tree = extra.tree
  notifyIfSettled(entry.runId)
}

export function markBlocked(id: string): void {
  const entry = findEntry(id)
  if (!entry || entry.phase === "settled" || entry.phase === "blocked_before_start") return
  entry.phase = "blocked_before_start"
  entry.settledAt = Date.now()
  notifyIfSettled(entry.runId)
}

export function blocked(
  op: SideEffectOp,
  ctx: { runId: string; toolCallId?: string; now?: number; toolTimeoutMs?: number; external?: "ssh" | "mcp" }
): SideEffectEntry {
  const now = ctx.now ?? Date.now()
  const timeout = effectiveToolTimeoutMs(ctx.toolTimeoutMs ?? 30_000)
  const entry: SideEffectEntry = {
    id: `se_${now.toString(36)}_${(entrySeq += 1).toString(36)}`,
    runId: ctx.runId,
    toolCallId: ctx.toolCallId,
    op,
    phase: "blocked_before_start",
    outcome: undefined,
    startedAt: now,
    settledAt: now,
    deadlineAt: now + timeout + STOP_KILL_GRACE_MS,
    ...(ctx.external ? { external: ctx.external } : {})
  }
  const ledger = ledgerOf(ctx.runId)
  ledger.entries.set(entry.id, entry)
  notifyIfSettled(ctx.runId)
  return entry
}

export function summarize(runId: string): SideEffectEntry[] {
  const ledger = ledgers.get(runId)
  if (!ledger) return []
  return [...ledger.entries.values()]
}

export function waitSettled(runId: string): Promise<void> {
  if (!hasUnsettled(runId)) return Promise.resolve()
  return new Promise((resolve) => {
    ledgerOf(runId).waiters.push(resolve)
  })
}

/** 登记 STUCK 夹具等对「再停一次」的响应。返回取消函数。 */
export function onRekill(runId: string, hook: RekillHook): () => void {
  const ledger = ledgerOf(runId)
  ledger.rekillHooks.push(hook)
  return () => {
    ledger.rekillHooks = ledger.rekillHooks.filter((item) => item !== hook)
  }
}

export async function rekill(runId: string): Promise<void> {
  const ledger = ledgers.get(runId)
  if (!ledger) return
  const hooks = [...ledger.rekillHooks]
  for (const hook of hooks) {
    try {
      hook()
    } catch (error) {
      console.error("[stop] rekill hook failed", error)
    }
  }
  const pids = [...ledger.entries.values()]
    .filter((entry) => rekillableEntry(entry))
    .map((entry) => entry.pid)
    .filter((pid): pid is number => typeof pid === "number")
  await Promise.all(pids.map((pid) => killTreeFn(pid)))
}

function rekillableEntry(entry: SideEffectEntry): boolean {
  if (typeof entry.pid !== "number") return false
  if (entry.phase === "settled" || entry.phase === "blocked_before_start") return false
  // Windows：子进程已退出就不要再 taskkill 复用后的 pid。
  if (isWindowsLivenessPlatform() && entry.childExited) return false
  return true
}

export function markPidChildExited(pid: number): void {
  for (const ledger of ledgers.values()) {
    for (const entry of ledger.entries.values()) {
      if (entry.pid === pid) entry.childExited = true
    }
  }
}

export function markChildExited(id: string): void {
  const entry = findEntry(id)
  if (entry) entry.childExited = true
}

let killTreeFn = forceKillTree

export function setKillTreeForTest(fn?: (pid: number) => Promise<void>): void {
  killTreeFn = fn ?? forceKillTree
}

export type SettleWatchContext = {
  runId: string
  sessionId: string
  window: BrowserWindow
  tools: ThreadToolCall[]
  input: RunAgentInput
  abortAt?: number
  knownTools?: ReceiptKnownTool[]
}

/**
 * 脱离 IPC 的 settle 监视：8s 最多一条 stuck 快照；终态只发一条（settled 或 final）。
 */
type SettleClock = {
  now: () => number
  setTimeout: typeof setTimeout
  setInterval: typeof setInterval
  clearTimeout: typeof clearTimeout
  clearInterval: typeof clearInterval
}

const realSettleClock: SettleClock = {
  now: () => Date.now(),
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval
}

let settleClock: SettleClock = realSettleClock

export function setSettleClockForTest(clock?: SettleClock): void {
  settleClock = clock ?? realSettleClock
}

export function armSettleWatch(ctx: SettleWatchContext): void {
  const ledger = ledgerOf(ctx.runId)
  if (ledger.terminalEmitted) return
  ledger.sessionId = ctx.sessionId
  ledger.window = ctx.window
  ledger.tools = ctx.tools
  ledger.input = ctx.input
  ledger.abortAt = ctx.abortAt ?? settleClock.now()
  ledger.knownTools = ctx.knownTools ?? ledger.knownTools
  clearLedgerTimers(ledger)

  const emitStuck = () => {
    if (ledger.terminalEmitted || ledger.stuckEmitted || !hasUnsettled(ctx.runId)) return
    ledger.stuckEmitted = true
    emitStopped(ledger, "stuck", receiptOf(ledger, "stuck"))
  }

  const emitHardFinal = () => {
    if (ledger.terminalEmitted) return
    closeUnsettledAsUnconfirmed(ctx.runId)
    finishTerminal(ledger, "final")
  }

  // 8s stuck 从 stopRequestedAt / abortAt（主进程收到 abort 的 t0）起算。
  const stuckDelay = Math.max(0, (ledger.abortAt ?? settleClock.now()) + STOP_STUCK_AFTER_MS - settleClock.now())
  const stuckTimer = settleClock.setTimeout(emitStuck, stuckDelay)
  stuckTimer.unref?.()
  ledger.timers.push(stuckTimer)

  const deadlineAt =
    latestDeadlineAt(ctx.runId) ??
    (ledger.abortAt ?? settleClock.now()) + effectiveToolTimeoutMs(30_000) + STOP_KILL_GRACE_MS
  const hardDelay = Math.max(0, deadlineAt - settleClock.now())
  const hardTimer = settleClock.setTimeout(emitHardFinal, hardDelay)
  hardTimer.unref?.()
  ledger.timers.push(hardTimer)

  const probe = settleClock.setInterval(() => {
    if (ledger.terminalEmitted) {
      settleClock.clearInterval(probe)
      return
    }
    settleSpawnedIfDead(ledger)
  }, 50)
  ledger.timers.push(probe)
  settleSpawnedIfDead(ledger)

  void waitSettled(ctx.runId).then(() => {
    if (ledger.terminalEmitted) return
    finishTerminal(ledger, ledger.stuckEmitted ? "final" : "settled")
  })
}

function settleSpawnedIfDead(ledger: RunLedger): void {
  for (const entry of ledger.entries.values()) {
    if (entry.phase !== "spawned" || typeof entry.pid !== "number") continue
    if (isWindowsLivenessPlatform() && entry.childExited) {
      settle(entry.id, "killed")
      continue
    }
    if (isTreeAlive(entry.pid)) continue
    settle(entry.id, "killed")
  }
}

export function rememberKnownTools(runId: string, tools: ReceiptKnownTool[]): void {
  ledgerOf(runId).knownTools = tools
}

export function receiptFor(runId: string, phase: "stuck" | "settled" | "final"): StopReceipt {
  return receiptOf(ledgerOf(runId), phase)
}

function finishTerminal(ledger: RunLedger, phase: "settled" | "final"): void {
  if (ledger.terminalEmitted) return
  ledger.terminalEmitted = true
  clearLedgerTimers(ledger)
  const receipt = receiptOf(ledger, phase)
  const turn = turnFromReceipt(ledger, receipt)
  emitStopped(ledger, phase, receipt, turn)
  if (!ledger.archived && ledger.sessionId && turn) persistTurnWorkflow(ledger.sessionId, turn)
  markSettledAndEvict(ledger)
}

function turnFromReceipt(ledger: RunLedger, receipt: StopReceipt): TurnOutcome | undefined {
  if (!ledger.input) return undefined
  if (receipt.write === "none_confirmed") {
    return stickyTurnOutcome(
      { workflow: "in_progress", attention: "stopped" },
      readSessionWorkflow(ledger.input.sessionId)
    )
  }
  return turnOutcomeForRun({ tools: ledger.tools, input: ledger.input }, "abort")
}

function emitStopped(
  ledger: RunLedger,
  phase: "stuck" | "settled" | "final",
  receipt: StopReceipt,
  turn?: TurnOutcome
): void {
  if (!ledger.window || !ledger.sessionId) return
  emitEvent(ledger.window, {
    type: "run.stopped",
    runId: ledger.runId,
    sessionId: ledger.sessionId,
    phase,
    receipt,
    ...(phase !== "stuck" && turn ? { turn } : {})
  })
}

function receiptOf(ledger: RunLedger, phase: "stuck" | "settled" | "final"): StopReceipt {
  const entries = [...ledger.entries.values()]
  const tree = entries.map((item) => item.tree).find((item) => item === "confirmed" || item === "best_effort")
  return decideStopReceipt({
    entries,
    knownTools: ledger.knownTools,
    phase,
    abortAt: ledger.abortAt,
    tree
  })
}

function closeUnsettledAsUnconfirmed(runId: string): void {
  const ledger = ledgers.get(runId)
  if (!ledger) return
  const now = settleClock.now()
  for (const entry of ledger.entries.values()) {
    if (entry.phase === "settled" || entry.phase === "blocked_before_start") continue
    if (typeof entry.pid === "number") {
      console.error("[stop] leftover process after hard deadline", { runId, pid: entry.pid, op: entry.op })
      abandonTreeWait(entry.pid)
    }
    entry.phase = "settled"
    entry.outcome = "unconfirmed"
    entry.settledAt = now
  }
  notifyIfSettled(runId)
}

function notifyIfSettled(runId: string): void {
  if (hasUnsettled(runId)) return
  const ledger = ledgers.get(runId)
  if (!ledger) return
  const waiters = ledger.waiters
  ledger.waiters = []
  for (const resolve of waiters) resolve()
}

function clearLedgerTimers(ledger: RunLedger): void {
  for (const timer of ledger.timers) {
    settleClock.clearTimeout(timer)
    settleClock.clearInterval(timer)
  }
  ledger.timers = []
}

function markSettledAndEvict(ledger: RunLedger): void {
  ledger.settledOrder = (settledSeq += 1)
  // 只回收已经发出终态的账本，保留未 settle 的。
  const done = [...ledgers.values()].filter((item) => item.terminalEmitted).sort((a, b) => (a.settledOrder ?? 0) - (b.settledOrder ?? 0))
  while (done.length > SETTLED_LEDGER_CAP) {
    const oldest = done.shift()
    if (!oldest) break
    ledgers.delete(oldest.runId)
  }
}

function findEntry(id: string): SideEffectEntry | undefined {
  for (const ledger of ledgers.values()) {
    const entry = ledger.entries.get(id)
    if (entry) return entry
  }
  return undefined
}

export function settleOrBlock(id: string, outcome: SideEffectOutcome = "error"): void {
  const entry = findEntry(id)
  if (!entry || entry.phase === "settled" || entry.phase === "blocked_before_start") return
  if (entry.phase === "spawned") {
    settle(id, outcome)
    return
  }
  markBlocked(id)
}

/** 正常结束且没有未 settle 条目时回收账本，避免无界增长。 */
export function reclaimLedgerIfIdle(runId: string): void {
  const ledger = ledgers.get(runId)
  if (!ledger || hasUnsettled(runId)) return
  clearLedgerTimers(ledger)
  ledgers.delete(runId)
}

setIdleLedgerReclaimer(reclaimLedgerIfIdle)

export function resetRunSideEffectsForTest(): void {
  for (const ledger of ledgers.values()) clearLedgerTimers(ledger)
  ledgers.clear()
  entrySeq = 0
  settledSeq = 0
  killTreeFn = forceKillTree
  settleClock = realSettleClock
}

export function ledgerSizeForTest(): number {
  return ledgers.size
}
