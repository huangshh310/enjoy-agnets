import assert from "node:assert/strict"
import { test } from "node:test"
import { runWhenComposerIdle, type ComposerIdleDeps } from "./composer-idle-turn.ts"

function fakeRunning(initial: boolean) {
  let running = initial
  const listeners = new Set<() => void>()
  const deps: ComposerIdleDeps = {
    isRunning: () => running,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
  const set = (next: boolean) => {
    running = next
    for (const listener of Array.from(listeners)) listener()
  }
  return { deps, set, listenerCount: () => listeners.size }
}

test("空闲时立刻占位", async () => {
  const fake = fakeRunning(false)
  let starts = 0
  assert.equal(await runWhenComposerIdle(fake.deps, 50, () => (starts += 1)), true)
  assert.equal(starts, 1)
})

test("两条排队发送同时在等：一次通知只放一条开跑，另一条重查后继续等到超时", async () => {
  const fake = fakeRunning(true)
  let starts = 0
  const claim = () => {
    starts += 1
    fake.set(true)
  }
  const first = runWhenComposerIdle(fake.deps, 80, claim)
  const second = runWhenComposerIdle(fake.deps, 80, claim)
  fake.set(false)
  const results = await Promise.all([first, second])
  assert.equal(starts, 1)
  assert.deepEqual([...results].sort(), [false, true])
  assert.equal(fake.listenerCount(), 0)
})

test("一直在跑：限时到了返回 false，不占位、不留订阅", async () => {
  const fake = fakeRunning(true)
  let starts = 0
  assert.equal(await runWhenComposerIdle(fake.deps, 30, () => (starts += 1)), false)
  assert.equal(starts, 0)
  assert.equal(fake.listenerCount(), 0)
})
