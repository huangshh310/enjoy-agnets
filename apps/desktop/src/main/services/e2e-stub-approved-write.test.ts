/**
 * 允许写盘后 stub 必须先吐匹配 toolCallId 的 tool-result，并写入 e2e-stub.txt。
 */
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import {
  createE2eStubStream,
  setE2eStubPackagedForTest,
  stubApprovedWriteResult,
  stubApprovedWriteToolCallId,
  STUB_WRITE_CONTENT,
  STUB_WRITE_PATH,
  writeStubApprovedFile
} from "./e2e-stub.ts"
import { resolveInsideWorkspace } from "./paths.ts"
import { hasUnsettled, latestDeadlineAt, rekill, resetRunSideEffectsForTest, setSettleClockForTest, summarize } from "./run-side-effects.ts"
import { abortActiveRunMemory } from "./abort-active-run.ts"
import { holdAgentRun } from "./agent-run-state.ts"
import {
  forceKillTree,
  resetTreeLivenessForTest,
  setTreeClockForTest
} from "./command.ts"

const here = dirname(fileURLToPath(import.meta.url))

function approvedWriteMessages(approvalId?: string): ModelMessage[] {
  return [
    { role: "user", content: "please write a note" },
    {
      role: "tool",
      content: [
        approvalId
          ? { type: "tool-approval-response", approvalId, approved: true }
          : { type: "tool-approval-response", approved: true }
      ]
    } as never
  ]
}

test("apr_stub_N 回写成同一序号的 tool_stub_N", () => {
  assert.equal(stubApprovedWriteToolCallId(approvedWriteMessages("apr_stub_7")), "tool_stub_7")
})

test("允许后先 tool-result 再正文，toolCallId 对上审批卡", async () => {
  let approvalId = ""
  let toolCallId = ""
  for await (const part of createE2eStubStream(
    [{ role: "user", content: "please write a note" }],
    new AbortController().signal
  )) {
    if (part.type !== "tool-approval-request") continue
    approvalId = String(part.approvalId ?? "")
    toolCallId = String(part.toolCallId ?? "")
  }
  assert.match(approvalId, /^apr_stub_\d+$/)
  assert.equal(toolCallId, approvalId.replace("apr_stub_", "tool_stub_"))

  const parts: Record<string, unknown>[] = []
  for await (const part of createE2eStubStream(
    approvedWriteMessages(approvalId),
    new AbortController().signal
  )) {
    parts.push(part)
  }
  assert.deepEqual(parts[0], stubApprovedWriteResult(toolCallId))
  const resultIndex = parts.findIndex((part) => part.type === "tool-result")
  const textIndex = parts.findIndex((part) => part.type === "text-start")
  assert.ok(resultIndex >= 0 && textIndex > resultIndex)
})

test("允许后写入 ENJOY_E2E_WORKSPACE/e2e-stub.txt", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-write-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  try {
    const written = await writeStubApprovedFile()
    // macOS `/tmp` → `/private/tmp`；跟 jail 同一套 realpath，不要和 mkdtemp 字面路径比。
    assert.equal(written, resolveInsideWorkspace(root, STUB_WRITE_PATH))
    assert.ok(written)
    assert.equal(await readFile(written, "utf8"), STUB_WRITE_CONTENT)
  } finally {
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }
})

test("打包态不写 stub 盘", async () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(true)
  try {
    assert.equal(await writeStubApprovedFile("/tmp/not-used"), null)
  } finally {
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
  }
})


test("SLOW_TOOL 等待可中断：abort 后不写盘、不吐 tool-result，账本 blocked_before_start", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-abort-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousSlow = process.env.ENJOY_E2E_SLOW_TOOL
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_SLOW_TOOL = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  resetRunSideEffectsForTest()
  const ac = new AbortController()
  const parts: Record<string, unknown>[] = []
  const consume = (async () => {
    for await (const part of createE2eStubStream(approvedWriteMessages("apr_stub_1"), ac.signal, { runId: "run_slow" })) {
      parts.push(part)
    }
  })()
  await new Promise((resolve) => setTimeout(resolve, 80))
  ac.abort()
  await consume
  try {
    assert.equal(parts.some((part) => part.type === "tool-result"), false)
    const target = resolveInsideWorkspace(root, STUB_WRITE_PATH)
    await assert.rejects(() => readFile(target, "utf8"))
    const rows = summarize("run_slow")
    assert.equal(rows[0]?.phase, "blocked_before_start")
    assert.equal(rows[0]?.op, "stub_write")
  } finally {
    resetRunSideEffectsForTest()
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    process.env.ENJOY_E2E_SLOW_TOOL = previousSlow
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }
})

test("STUCK_TOOL：忽略 abort，rekill 立刻 settle 且不写盘", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-stuck-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousStuck = process.env.ENJOY_E2E_STUCK_TOOL
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_STUCK_TOOL = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  resetRunSideEffectsForTest()
  const ac = new AbortController()
  const consume = (async () => {
    for await (const _part of createE2eStubStream(approvedWriteMessages("apr_stub_2"), ac.signal, { runId: "run_stuck" })) {
      // fixture should not yield a write
    }
  })()
  await new Promise((resolve) => setTimeout(resolve, 80))
  ac.abort()
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(hasUnsettled("run_stuck"), true)
  const started = Date.now()
  await rekill("run_stuck")
  await consume
  try {
    assert.ok(Date.now() - started < 1_000, "rekill should settle immediately")
    assert.equal(hasUnsettled("run_stuck"), false)
    const rows = summarize("run_stuck")
    assert.equal(rows[0]?.op, "bash")
    assert.equal(rows[0]?.phase, "settled")
    assert.equal(rows[0]?.outcome, "killed")
    const target = resolveInsideWorkspace(root, STUB_WRITE_PATH)
    await assert.rejects(() => readFile(target, "utf8"))
  } finally {
    resetRunSideEffectsForTest()
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    process.env.ENJOY_E2E_STUCK_TOOL = previousStuck
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }
})


class FakeClock {
  nowMs = 0
  seq = 0
  oneshots: Array<{ id: number; due: number; fn: () => void }> = []
  intervals: Array<{ id: number; due: number; fn: () => void; step: number }> = []
  now = () => this.nowMs
  setTimeout = (fn: () => void, ms?: number) => {
    const id = ++this.seq
    this.oneshots.push({ id, due: this.nowMs + (ms ?? 0), fn })
    return id as unknown as ReturnType<typeof setTimeout>
  }
  setInterval = (fn: () => void, ms?: number) => {
    const id = ++this.seq
    const step = ms ?? 0
    this.intervals.push({ id, due: this.nowMs + step, fn, step })
    return id as unknown as ReturnType<typeof setInterval>
  }
  clearTimeout = (handle: ReturnType<typeof setTimeout>) => {
    const id = handle as unknown as number
    this.oneshots = this.oneshots.filter((item) => item.id !== id)
  }
  clearInterval = (handle: ReturnType<typeof setInterval>) => {
    const id = handle as unknown as number
    this.intervals = this.intervals.filter((item) => item.id !== id)
  }
  tick(ms: number) {
    const end = this.nowMs + ms
    while (true) {
      const next = [...this.oneshots, ...this.intervals].sort((a, b) => a.due - b.due)[0]
      if (!next || next.due > end) {
        this.nowMs = end
        return
      }
      this.nowMs = next.due
      const interval = this.intervals.find((item) => item.id === next.id)
      if (interval) {
        interval.due += interval.step
        interval.fn()
      } else {
        this.oneshots = this.oneshots.filter((item) => item.id !== next.id)
        next.fn()
      }
    }
  }
}

function fakeWindow(events: unknown[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: {
      send(_ch: string, event: unknown) {
        events.push(event)
      }
    }
  } as unknown as BrowserWindow
}

function holdRun(runId: string, sessionId: string, events: unknown[]) {
  holdAgentRun({
    runId,
    window: fakeWindow(events),
    workspaceRoot: "/tmp",
    messages: [],
    input: {
      sessionId,
      workspaceId: "ws_stuck_cap",
      modelId: "m",
      mode: "agent",
      attachments: [],
      messages: [{ role: "user", content: "hi" }]
    }
  })
}

function stoppedEvents(events: unknown[]) {
  return events.filter((item) => (item as { type?: string }).type === "run.stopped") as Array<{
    type: string
    phase: string
    receipt?: { write?: string }
  }>
}

test("STUCK 夹具源码：只在 stub 夹具里给子进程加 ELECTRON_RUN_AS_NODE", () => {
  const src = readFileSync(join(here, "e2e-stub.ts"), "utf8")
  const fn = src.split("async function runStuckToolFixture")[1] ?? ""
  assert.match(fn, /extraEnv:\s*\{\s*ELECTRON_RUN_AS_NODE:\s*"1"\s*\}/)
  assert.match(fn, /if \(!isE2eStub\(\)\) return/)
})

test("STUCK 夹具与 N2/N3 上限互不干扰：deadline 强制 final+maybe_partial，树上限不提前落定，rekill 仍立刻 settle", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-stuck-cap-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousStuck = process.env.ENJOY_E2E_STUCK_TOOL
  const previousTimeout = process.env.ENJOY_E2E_TOOL_TIMEOUT_MS
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_STUCK_TOOL = "1"
  process.env.ENJOY_E2E_TOOL_TIMEOUT_MS = "5000"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)

  const restore = async () => {
    resetRunSideEffectsForTest()
    resetTreeLivenessForTest()
    setTreeClockForTest()
    setSettleClockForTest()
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    process.env.ENJOY_E2E_STUCK_TOOL = previousStuck
    if (previousTimeout == null) delete process.env.ENJOY_E2E_TOOL_TIMEOUT_MS
    else process.env.ENJOY_E2E_TOOL_TIMEOUT_MS = previousTimeout
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }

  try {
    // 1) rekill 在探活钉死 + 树 timeout=120s（N3 上限 122s）时仍立刻 settle。
    resetRunSideEffectsForTest()
    const acRekill = new AbortController()
    const consumeRekill = (async () => {
      for await (const _part of createE2eStubStream(approvedWriteMessages("apr_stub_3"), acRekill.signal, {
        runId: "run_stuck_rekill"
      })) {
        // fixture should not yield
      }
    })()
    await new Promise((resolve) => setTimeout(resolve, 80))
    acRekill.abort()
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(hasUnsettled("run_stuck_rekill"), true)
    const rekillStarted = Date.now()
    await rekill("run_stuck_rekill")
    await consumeRekill
    assert.ok(Date.now() - rekillStarted < 1_000, "rekill should settle immediately, not wait for the 122s tree cap")
    assert.equal(hasUnsettled("run_stuck_rekill"), false)
    assert.equal(summarize("run_stuck_rekill")[0]?.phase, "settled")
    assert.equal(summarize("run_stuck_rekill")[0]?.outcome, "killed")

    // 2) 探活钉死后，latestDeadlineAt（5s+2s）强制 final+maybe_partial；
    //    N3 树上限是 120s+2s，不得在 deadline 之前把回执落成非 stuck 终态。
    resetRunSideEffectsForTest()
    resetTreeLivenessForTest()
    const clock = new FakeClock()
    clock.nowMs = Date.now()
    setTreeClockForTest(clock)
    setSettleClockForTest(clock)
    const events: unknown[] = []
    holdRun("run_stuck_deadline", "ses_stuck_deadline", events)
    const acDeadline = new AbortController()
    const consumeDeadline = (async () => {
      for await (const _part of createE2eStubStream(approvedWriteMessages("apr_stub_4"), acDeadline.signal, {
        runId: "run_stuck_deadline"
      })) {
        // fixture should not yield
      }
    })()
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(hasUnsettled("run_stuck_deadline"), true)
    const pid = summarize("run_stuck_deadline")[0]?.pid
    acDeadline.abort()
    abortActiveRunMemory("run_stuck_deadline")
    const deadlineAt = latestDeadlineAt("run_stuck_deadline")
    assert.ok(typeof deadlineAt === "number")
    const before = Math.max(0, deadlineAt - clock.now() - 1)
    clock.tick(before)
    await Promise.resolve()
    assert.equal(hasUnsettled("run_stuck_deadline"), true)
    assert.equal(
      stoppedEvents(events).some((item) => item.phase === "settled" || item.phase === "final"),
      false,
      "N3 tree cap (spawn+120s+2s) must not finalize before latestDeadlineAt"
    )
    clock.tick(1)
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(hasUnsettled("run_stuck_deadline"), false)
    const finals = stoppedEvents(events).filter((item) => item.phase === "final")
    assert.equal(finals.length, 1)
    assert.equal(finals[0]?.receipt?.write, "maybe_partial")
    assert.equal(
      stoppedEvents(events).some((item) => item.phase === "settled"),
      false
    )
    await consumeDeadline
    if (typeof pid === "number") {
      try {
        await forceKillTree(pid)
      } catch {
        // already gone
      }
    }
  } finally {
    await restore()
  }
})
