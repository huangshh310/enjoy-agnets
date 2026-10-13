import assert from "node:assert/strict"
import { test } from "node:test"
import { armSendWatchdog, markSendLaunched, resetSendWatchdogForTest, sendAttemptCancelled } from "./send-watchdog.ts"

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
  resetSendWatchdogForTest()
  const clock = fakeTimers()
  const p = probe()
  armSendWatchdog("hello fast 2", p.probe, clock.timers)
  clock.advance(2_750)
  assert.deepEqual(p.failed, [])
  clock.advance(500)
  assert.deepEqual(p.failed, ["hello fast 2"])
  assert.equal(sendAttemptCancelled(), true)
  assert.equal(clock.running, false)
})

test("agent.run 发出即收手", () => {
  resetSendWatchdogForTest()
  const clock = fakeTimers()
  const p = probe()
  armSendWatchdog("x", p.probe, clock.timers)
  clock.advance(1_000)
  markSendLaunched()
  clock.advance(10_000)
  assert.deepEqual(p.failed, [])
  assert.equal(sendAttemptCancelled(), false)
})

test("已有提示挂着：不重复判", () => {
  resetSendWatchdogForTest()
  const clock = fakeTimers()
  const p = probe({ noticeShown: () => true })
  armSendWatchdog("x", p.probe, clock.timers)
  clock.advance(10_000)
  assert.deepEqual(p.failed, [])
})

test("创建窗内排队不计时，创建完成后再起算 3s", () => {
  resetSendWatchdogForTest()
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

test("新的一次 Enter 顶掉旧看门狗", () => {
  resetSendWatchdogForTest()
  const a = fakeTimers()
  const b = fakeTimers()
  const p = probe()
  armSendWatchdog("old", p.probe, a.timers)
  armSendWatchdog("new", p.probe, b.timers)
  a.advance(5_000)
  assert.deepEqual(p.failed, [])
  b.advance(3_250)
  assert.deepEqual(p.failed, ["new"])
})
