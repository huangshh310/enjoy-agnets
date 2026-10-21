/**
 * jojo 巡检 54a533a2 B（#169 里一起确认）：审批刚到的那一刻点停止，两轮都留在 waiting_review、
 * 审批 decision=null，侧栏「消息」角标 2、收件箱两条「等你决定 · 写入文件」，点「立即前往审批」进去没有批准按钮、角标不掉。
 *
 * 这里把两边接起来真走：渲染端 abortComposerRun / dispatchAgentEvent / Attention / 徽标重拉节拍，
 * 桥上的 ai.abort 落到 main 的 abortActiveRunMemory（+ abortGeneration 的 cancelled），inbox.listPendingApprovals 落到
 * main 的 listPendingApprovalsForInbox（真 SQL）；main 推给窗口的事件排队，像 IPC 一样随后才到渲染端。
 * 徽标 = 收件箱 rail 的 inboxRailCount（真函数），「实时」徽标按 use-live-pending-approvals 的重拉依据跟着拉。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import type { BrowserWindow } from "electron"

const main = await import("./stop-approval-inbox.behavior.load.ts")

// ---- 渲染端环境：window.ide 桥接到 main 的真函数 ----
const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}
const abortCalls: string[] = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".ai.abort") {
        // main 按到达顺序处理 invoke：abortGeneration → abortAgent → abortActiveRunMemory（同步段），随后再写一次 cancelled。
        const runId = String(args[0])
        abortCalls.push(runId)
        main.abortActiveRunMemory(runId)
        main.updateRun(main.getDatabase(), runId, { status: "cancelled", checkpoint: null })
        return Promise.resolve({ ok: true })
      }
      if (path === ".inbox.listPendingApprovals") return Promise.resolve(main.listPendingApprovalsForInbox({}))
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("@renderer/stores/chat-store")
const { useAttentionStore } = await import("@renderer/stores/attention/attention-store")
const { abortComposerRun } = await import("@renderer/hooks/composer-run-control")
const { dispatchAgentEvent } = await import("@renderer/stores/attention/dispatch-agent-event")
const { inboxPendingRefreshKey, useInboxPendingEpoch } = await import("@renderer/stores/attention/inbox-pending-refresh")
const { inboxRailCount } = await import("@renderer/components/inbox/lib/inbox-default-tab")
const { pickLivePendingForSession } = await import("@renderer/hooks/hydrate-live-pending-approval")
const { resetStoppedRunsForTest } = await import("@renderer/hooks/stopped-runs")
const storesStopped = await import("@renderer/stores/stopped-runs")
const { takeClientRequestId, resetClientRequestIdForTest } = await import("@renderer/hooks/runtime-interact/client-request-id")
const queue = await import("@renderer/hooks/followup-queue")

main.markRestoreWaitingSettled()

// ---- main → 渲染端：事件排队，flush 时才到 ----
type Wire = { type: string; runId?: string; sessionId?: string; decision?: string; code?: string }
const wire: Wire[] = []
const delivered: Wire[] = []
const mainWindow = {
  isDestroyed: () => false,
  webContents: { send: (_ch: string, event: Wire) => void wire.push(event) }
} as unknown as BrowserWindow

async function ipcTick(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve))
}

async function flushToRenderer(): Promise<void> {
  while (wire.length > 0) {
    const event = wire.shift() as Wire
    delivered.push(event)
    dispatchAgentEvent(event as never)
    await ipcTick()
  }
  await ipcTick()
}

// ---- 徽标：照 use-live-pending-approvals 的重拉依据 + activity-bar 的 inboxRailCount ----
let liveItems: Array<{ sessionId: string; runId: string; id: string }> = []
let lastKey = ""
let liveSessions = new Set<string>()
function refreshKey(): string {
  return inboxPendingRefreshKey(useAttentionStore.getState().items, useInboxPendingEpoch.getState().epoch)
}
function maybeRefresh(): void {
  const key = refreshKey()
  if (key === lastKey) return
  lastKey = key
  void Promise.resolve(main.listPendingApprovalsForInbox({})).then((result) => {
    liveItems = result.items
  })
}
useAttentionStore.subscribe(maybeRefresh)
useInboxPendingEpoch.subscribe(maybeRefresh)

function badgeOf(items: ReadonlyArray<{ sessionId: string }>): number {
  return inboxRailCount({
    liveSessionIds: liveSessions,
    pendingApprovalSessionIds: items.map((row) => row.sessionId),
    attentionItems: useAttentionStore.getState().items
  })
}
/** 打开收件箱 / 侧栏重新挂载时拉到的数。 */
function freshBadge(): number {
  return badgeOf(main.listPendingApprovalsForInbox({}).items)
}
/** 一直挂着的侧栏角标（只在重拉依据变化时拉过）。 */
function liveBadge(): number {
  return badgeOf(liveItems)
}
/** 停止前别处（另一个会话出错等）恰好让徽标拉了一次。 */
async function unrelatedRefresh(): Promise<void> {
  lastKey = ""
  maybeRefresh()
  await ipcTick()
}

afterEach(() => {
  wire.length = 0
  delivered.length = 0
  abortCalls.length = 0
  queue.resetFollowupsForTest()
  resetStoppedRunsForTest()
  storesStopped.resetStoppedRunsForTest()
  resetClientRequestIdForTest()
})

let seq = 1600
function seedSession(tag: string): string {
  seq += 1
  const sessionId = `ses_sai_${tag}_${seq}`
  const db = main.getDatabase()
  db.prepare(
    "INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("ws_sai", "ws", "/tmp", 1, 1)
  db.prepare(
    "INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, "ws_sai", "very slow", 1, 1)
  liveSessions = new Set([sessionId])
  return sessionId
}

/** main 开跑一轮（agent.run 已受理），渲染端 Composer 进入在跑；claimed=false 是起步窗口（回执没回、runId 没认领）。 */
function startRun(sessionId: string, claimed: boolean) {
  seq += 1
  const runId = `run_sai_${seq}`
  const db = main.getDatabase()
  main.insertRun(db, {
    id: runId,
    sessionId,
    workspaceId: "ws_sai",
    kind: "agent",
    status: "running",
    modelId: "m",
    providerId: null,
    checkpoint: null,
    error: null
  })
  const messages = [{ role: "user" as const, content: "very slow" }]
  main.holdAgentRun({
    runId,
    window: mainWindow,
    workspaceRoot: "/tmp",
    messages: [...messages],
    input: { sessionId, workspaceId: "ws_sai", modelId: "m", mode: "agent", attachments: [], messages }
  } as never)
  const run = main.getActiveRun(runId)
  if (!run) throw new Error("hold failed")
  run.pumping = true
  resetClientRequestIdForTest()
  const clientRequestId = claimed ? undefined : takeClientRequestId(sessionId as never)
  if (claimed) useAttentionStore.getState().rememberRun(runId, sessionId)
  useChatStore.setState({
    workspaceId: "ws_sai",
    sessionId,
    running: true,
    runId: claimed ? runId : null,
    runtimeId: "enjoy-local",
    composer: "",
    error: null,
    notice: null,
    pendingApproval: null,
    hasKey: true,
    pendingStreamEvents: [],
    messages: [
      { id: `u_${runId}`, role: "user", content: "very slow", createdAt: 1 },
      { id: `a_${runId}`, role: "assistant", content: "one two", createdAt: 2, streaming: true, runId }
    ]
  } as never)
  const approvalPart = main.stubWriteApprovalPart(seq) as { approvalId: string }
  return { runId, run, approvalPart: approvalPart as Record<string, unknown>, approvalId: approvalPart.approvalId, clientRequestId }
}

/** agent-pump：consume 之后有未决就停车写 waiting_review。 */
function pumpTail(run: { pendingApprovals: unknown[] }, runId: string) {
  if (run.pendingApprovals.length > 0) main.persistWaitingRun(run as never, runId)
}

/** 用户在审批到达的那一刻点停止：stub「very slow」睡着时停，醒来照样吐审批（jojo 两次撞上的就是这个）。 */
async function stopAtApprovalMoment(sessionId: string, opts?: { claimed?: boolean; refreshBeforeStop?: boolean }) {
  const claimed = opts?.claimed ?? true
  const { runId, run, approvalPart, approvalId } = startRun(sessionId, claimed)
  async function* stream() {
    yield { type: "text-start", id: "text" }
    yield { type: "text-delta", text: "one " }
    await abortComposerRun()
    yield approvalPart
  }
  await main.consumeRun(runId, run, stream())
  pumpTail(run, runId)
  await flushToRenderer()
  return { runId, approvalId }
}

/** 停止之后用户能看到 / 库里留下的全部：jojo 报的是每一项都不干净。 */
function afterStopSnapshot(sessionId: string, runs: Array<{ runId: string; approvalId: string }>) {
  const db = main.getDatabase()
  const inbox = main.listPendingApprovalsForInbox({}).items.filter((row) => row.sessionId === sessionId)
  return {
    runStatus: runs.map(({ runId }) => main.getRun(db, runId)?.status),
    undecidedApprovals: runs.map(({ approvalId }) => {
      const stored = main.getApproval(db, approvalId)
      return stored == null ? "not-written" : stored.decision === null ? "decision=null" : "settled"
    }),
    inboxEntries: inbox.map((row) => `等你决定 · ${row.name}`),
    goToApproval: pickLivePendingForSession(inbox, sessionId)?.runId ?? null,
    freshBadge: freshBadge(),
    liveBadge: liveBadge()
  }
}

function assertCleanAfterStop(sessionId: string, runs: Array<{ runId: string; approvalId: string }>) {
  const snapshot = afterStopSnapshot(sessionId, runs)
  assert.deepEqual(
    { ...snapshot, undecidedApprovals: snapshot.undecidedApprovals.map((v) => (v === "decision=null" ? v : "ok")) },
    {
      runStatus: runs.map(() => "cancelled"),
      undecidedApprovals: runs.map(() => "ok"),
      inboxEntries: [],
      goToApproval: null,
      freshBadge: 0,
      liveBadge: 0
    },
    "停止后：run cancelled、审批不留 decision=null、收件箱没有「等你决定」、「立即前往审批」无处可去、角标（打开收件箱 / 侧栏实时）都是 0"
  )
  const db = main.getDatabase()
  for (const { runId } of runs) {
    assert.equal(main.listPendingApprovals(db, runId).length, 0, `${runId}：不留 decision=null 的审批行`)
  }
  const store = useChatStore.getState()
  assert.equal(store.pendingApproval, null, "界面不挂审批卡")
  assert.equal(store.running, false, "停止按钮落下")
}

test("jojo 原样：审批刚到时点停止，再发一句又在审批刚到时停——两轮都 cancelled、审批结清、收件箱和角标清零", async () => {
  const sessionId = seedSession("jojo")
  const first = await stopAtApprovalMoment(sessionId)
  const second = await stopAtApprovalMoment(sessionId)
  assert.deepEqual(abortCalls, [first.runId, second.runId], "每轮只停了一次")
  assertCleanAfterStop(sessionId, [first, second])
})

test("停在审批事件途中（consumeApprovalRequired 正在 await）：库、收件箱、角标都干净", async () => {
  const sessionId = seedSession("during")
  const { runId, run, approvalPart, approvalId } = startRun(sessionId, true)
  let stoppedAt = ""
  const parts: Record<string, unknown>[] = [{ type: "text-start", id: "text" }, approvalPart]
  const stream: AsyncIterable<Record<string, unknown>> = {
    [Symbol.asyncIterator]() {
      return {
        next() {
          const value = parts.shift()
          const result = Promise.resolve(value ? { value, done: false as const } : { value: undefined, done: true as const })
          if (value === approvalPart) {
            void result.then(() =>
              queueMicrotask(() => {
                stoppedAt = wire.some((event) => event.type === "approval.required") ? "after-emit" : "in-flight"
                void abortComposerRun()
              })
            )
          }
          return result
        }
      }
    }
  }
  await main.consumeRun(runId, run, stream)
  pumpTail(run, runId)
  await flushToRenderer()
  assert.equal(stoppedAt, "in-flight", "停止确实落在审批处理途中")
  assertCleanAfterStop(sessionId, [{ runId, approvalId }])
})

test("审批已落库、卡还在 IPC 上，徽标恰好先拉到 1，再点停止：main 结清后角标实时落到 0", async () => {
  const sessionId = seedSession("persisted")
  const { runId, run, approvalPart, approvalId } = startRun(sessionId, true)
  async function* stream() {
    yield approvalPart
  }
  await main.consumeRun(runId, run, stream())
  pumpTail(run, runId)
  assert.equal(main.getRun(main.getDatabase(), runId)?.status, "waiting_review", "对照：没停时照常停车等审批")
  await unrelatedRefresh()
  assert.equal(liveBadge(), 1, "停止前角标拉到了这条未决")
  await abortComposerRun()
  await flushToRenderer()
  assert.ok(
    delivered.some((event) => event.type === "approval.resolved" && event.decision === "cancelled"),
    "main 把未决结清成 cancelled 并推了出来"
  )
  assertCleanAfterStop(sessionId, [{ runId, approvalId }])
})

test("N3：审批卡已到渲染端、角标 1，再点停止：Attention 先收、main 后结清——迟到的 approval.resolved / 安静的 run.error 也敲节拍，角标实时落到 0", async () => {
  const sessionId = seedSession("card-up")
  const { runId, run, approvalPart, approvalId } = startRun(sessionId, true)
  async function* stream() {
    yield approvalPart
  }
  await main.consumeRun(runId, run, stream())
  pumpTail(run, runId)
  await flushToRenderer()
  assert.ok(useChatStore.getState().pendingApproval, "对照：卡挂出来了")
  assert.equal(liveBadge(), 1, "停止前角标是这条未决")
  // 只看停止之后渲染端收到的事件：结清 / 收尾都只来自 main，不再有 approval.required。
  delivered.length = 0
  await abortComposerRun()
  await flushToRenderer()
  assert.deepEqual(
    delivered.map((event) => event.type).filter((type) => type === "approval.required"),
    [],
    "停止之后没有新的 approval.required 来敲节拍"
  )
  assert.ok(
    delivered.some((event) => event.type === "approval.resolved" && event.decision === "cancelled"),
    "main 把未决结清成 cancelled 并推了出来"
  )
  assertCleanAfterStop(sessionId, [{ runId, approvalId }])
})

test("起步窗口（回执没回、runId 没认领）点停止，审批已在 main 落库：开跑带回的 id 被认出、abort，结清后角标落到 0", async () => {
  const sessionId = seedSession("before-claim")
  const { runId, run, approvalPart, approvalId, clientRequestId } = startRun(sessionId, false)
  await abortComposerRun()
  assert.deepEqual(abortCalls, [], "还没 runId：停止先只记下在路上那一发")
  wire.push({ type: "run.start", runId, sessionId, kind: "agent", prompt: "very slow", clientRequestId } as Wire)
  async function* stream() {
    yield approvalPart
  }
  await main.consumeRun(runId, run, stream())
  pumpTail(run, runId)
  await unrelatedRefresh()
  await flushToRenderer()
  assert.deepEqual(abortCalls, [runId], "认出被停的那一发并 abort")
  assertCleanAfterStop(sessionId, [{ runId, approvalId }])
})

test("对照：没停的一轮审批照常进收件箱、角标 1，「立即前往审批」有条目", async () => {
  const sessionId = seedSession("control")
  const { runId, run, approvalPart } = startRun(sessionId, true)
  async function* stream() {
    yield approvalPart
  }
  try {
    await main.consumeRun(runId, run, stream())
    pumpTail(run, runId)
    await flushToRenderer()
    assert.equal(main.getRun(main.getDatabase(), runId)?.status, "waiting_review")
    const items = main.listPendingApprovalsForInbox({}).items.filter((row) => row.sessionId === sessionId)
    assert.equal(items.length, 1)
    assert.equal(pickLivePendingForSession(items, sessionId)?.runId, runId)
    assert.equal(freshBadge(), 1)
    assert.equal(liveBadge(), 1)
    assert.ok(useChatStore.getState().pendingApproval, "卡挂出来，有批准按钮")
  } finally {
    main.abortActiveRunMemory(runId)
    await flushToRenderer()
  }
})
