import assert from "node:assert/strict"
import { test } from "node:test"
import { armSendWatchdog, markSendLaunched, pauseSendWatchdog, sendAttemptCancelled } from "./send-watchdog.ts"

function fakeTimers() {
  let now = 0
  let tick: (() => void) | null = null
  return {
    timers: {
      now: () => now,
      every: (fn: () => void) => {
        tick = fn
        return () => {
          tick = null
        }
      }
    },
    advance(ms: number) {
      for (let t = 0; t < ms; t += 250) {
        now += 250
        tick?.()
      }
    },
    get running() {
      return tick !== null
    }
  }
}

function probe(over: Partial<Parameters<typeof armSendWatchdog>[1]> = {}) {
  const failed: string[] = []
  return {
    failed,
    probe: {
      noticeShown: () => false,
      createPending: () => false,
      otherRunActive: () => false,
      fail: (text: string) => failed.push(text),
      ...over
    }
  }
}

test("Enter 后 3s 既没发出也没提示：还稿出提示，迟到的发送作废", () => {
  const clock = fakeTimers()
  const p = probe()
  const attempt = armSendWatchdog("hello fast 2", p.probe, clock.timers)
  clock.advance(2_750)
  assert.deepEqual(p.failed, [])
  clock.advance(500)
  assert.deepEqual(p.failed, ["hello fast 2"])
  assert.equal(sendAttemptCancelled(attempt), true)
  assert.equal(clock.running, false)
})

test("agent.run 发出即收手", () => {
  const clock = fakeTimers()
  const p = probe()
  const attempt = armSendWatchdog("x", p.probe, clock.timers)
  clock.advance(1_000)
  markSendLaunched(attempt)
  clock.advance(10_000)
  assert.deepEqual(p.failed, [])
  assert.equal(sendAttemptCancelled(attempt), false)
})

test("已有提示挂着：不重复判", () => {
  const clock = fakeTimers()
  const p = probe({ noticeShown: () => true })
  armSendWatchdog("x", p.probe, clock.timers)
  clock.advance(10_000)
  assert.deepEqual(p.failed, [])
})

test("创建窗内排队不计时，创建完成后再起算 3s", () => {
  const clock = fakeTimers()
  let pending = true
  const p = probe({ createPending: () => pending })
  armSendWatchdog("queued", p.probe, clock.timers)
  clock.advance(10_000)
  assert.deepEqual(p.failed, [])
  pending = false
  clock.advance(2_500)
  assert.deepEqual(p.failed, [])
  clock.advance(750)
  assert.deepEqual(p.failed, ["queued"])
})

test("每次 Enter 一个句柄：标记一个发出不影响另一个", () => {
  const a = fakeTimers()
  const b = fakeTimers()
  const p = probe()
  const first = armSendWatchdog("old", p.probe, a.timers)
  const second = armSendWatchdog("new", p.probe, b.timers)
  markSendLaunched(first)
  a.advance(5_000)
  assert.deepEqual(p.failed, [])
  b.advance(3_250)
  assert.deepEqual(p.failed, ["new"])
  assert.equal(sendAttemptCancelled(first), false)
  assert.equal(sendAttemptCancelled(second), true)
})

test("/compact 等合法长等待期间暂停计时", async () => {
  const clock = fakeTimers()
  const p = probe()
  const attempt = armSendWatchdog("/compact 后续问题", p.probe, clock.timers)
  let release!: () => void
  const waiting = pauseSendWatchdog(attempt, () => new Promise<void>((resolve) => (release = resolve)))
  clock.advance(10_000)
  assert.deepEqual(p.failed, [])
  release()
  await waiting
  markSendLaunched(attempt)
  clock.advance(5_000)
  assert.deepEqual(p.failed, [])
})
