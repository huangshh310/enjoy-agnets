/**
 * 停止后探活状态机（jojo 拍板）：2s / 8s / 上限三个节点，死活都覆盖。
 * 使用注入时钟与底层探活，不灌渲染假状态。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import type { BrowserWindow } from "electron"
import { STOP_KILL_GRACE_MS, STOP_STUCK_AFTER_MS } from "@enjoy-agents/ipc-contract/stop-receipt"
import type { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { resetTreeLivenessForTest, setTreeLivenessProbeForTest } from "./command.ts"
import {
  armSettleWatch,
  begin,
  hasUnsettled,
  resetRunSideEffectsForTest,
  setSettleClockForTest,
  spawned
} from "./run-side-effects.ts"

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

const input: RunAgentInput = {
  sessionId: "ses_live",
  workspaceId: "ws_live",
  modelId: "m",
  mode: "agent",
  attachments: [],
  messages: [{ role: "user", content: "hi" }]
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

function arm(runId: string, events: unknown[], clock: FakeClock, toolTimeoutMs = 20_000) {
  const entry = begin("bash", { runId, toolCallId: "tool_live", toolTimeoutMs, now: 0 })
  spawned(entry.id, 4242)
  setSettleClockForTest(clock)
  armSettleWatch({
    runId,
    sessionId: "ses_live",
    window: fakeWindow(events),
    tools: [],
    input,
    abortAt: 0
  })
  return entry
}

function stopped(events: unknown[]) {
  return events.filter((item) => (item as { type?: string }).type === "run.stopped") as Array<{
    type: string
    phase: string
    receipt?: { write?: string }
  }>
}

afterEach(() => {
  resetRunSideEffectsForTest()
  resetTreeLivenessForTest()
  setSettleClockForTest()
})

test("2s 探活见到死亡：立刻按回执落定 settled，不走 stuck / final", async () => {
  const clock = new FakeClock()
  let alive = true
  setTreeLivenessProbeForTest(() => alive)
  const events: unknown[] = []
  arm("run_2s_dead", events, clock)
  clock.tick(1_999)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_2s_dead"), true)
  assert.equal(stopped(events).length, 0)
  alive = false
  clock.tick(50)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_2s_dead"), false)
  const end = stopped(events)
  assert.equal(end.length, 1)
  assert.equal(end[0]?.phase, "settled")
  assert.equal(end[0]?.receipt?.write, "maybe_partial")
})

test("2s 仍存活：不落 maybe_partial，继续 stopping，无终态事件", async () => {
  const clock = new FakeClock()
  setTreeLivenessProbeForTest(() => true)
  const events: unknown[] = []
  arm("run_2s_alive", events, clock)
  clock.tick(2_000)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_2s_alive"), true)
  assert.equal(stopped(events).length, 0)
})

test("8s 仍存活：发 stuck，继续探活，还不落定", async () => {
  const clock = new FakeClock()
  setTreeLivenessProbeForTest(() => true)
  const events: unknown[] = []
  arm("run_8s_alive", events, clock)
  clock.tick(STOP_STUCK_AFTER_MS)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_8s_alive"), true)
  const shots = stopped(events)
  assert.equal(shots.length, 1)
  assert.equal(shots[0]?.phase, "stuck")
})

test("8s 后探活见到死亡：立刻落定 final", async () => {
  const clock = new FakeClock()
  let alive = true
  setTreeLivenessProbeForTest(() => alive)
  const events: unknown[] = []
  arm("run_8s_dead", events, clock)
  clock.tick(STOP_STUCK_AFTER_MS)
  await Promise.resolve()
  assert.equal(stopped(events)[0]?.phase, "stuck")
  alive = false
  clock.tick(50)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_8s_dead"), false)
  const end = stopped(events).filter((item) => item.phase !== "stuck")
  assert.equal(end.length, 1)
  assert.equal(end[0]?.phase, "final")
  assert.equal(end[0]?.receipt?.write, "maybe_partial")
})

test("上限仍存活：强制 final，回执 maybe_partial", async () => {
  const clock = new FakeClock()
  setTreeLivenessProbeForTest(() => true)
  const events: unknown[] = []
  const timeout = 5_000
  arm("run_dl_alive", events, clock, timeout)
  clock.tick(timeout + STOP_KILL_GRACE_MS)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_dl_alive"), false)
  const end = stopped(events).filter((item) => item.phase === "final")
  assert.equal(end.length, 1)
  assert.equal(end[0]?.receipt?.write, "maybe_partial")
})

test("上限前探活见到死亡：按死亡落定，不等待上限", async () => {
  const clock = new FakeClock()
  let alive = true
  setTreeLivenessProbeForTest(() => alive)
  const events: unknown[] = []
  const timeout = 5_000
  arm("run_dl_dead", events, clock, timeout)
  clock.tick(timeout + STOP_KILL_GRACE_MS - 100)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_dl_dead"), true)
  alive = false
  clock.tick(50)
  await Promise.resolve()
  assert.equal(hasUnsettled("run_dl_dead"), false)
  const end = stopped(events).filter((item) => item.phase !== "stuck")
  assert.equal(end.length, 1)
  assert.ok(end[0]?.phase === "settled" || end[0]?.phase === "final")
  assert.ok(clock.nowMs < timeout + STOP_KILL_GRACE_MS)
})
