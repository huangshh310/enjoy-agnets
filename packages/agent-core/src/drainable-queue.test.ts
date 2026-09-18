import assert from "node:assert/strict"
import { test } from "node:test"
import { DrainableQueue } from "./drainable-queue.ts"

test("drain 等到当前项做完，不只看队列空", async () => {
  let started = 0
  let finished = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const queue = new DrainableQueue<string>(async () => {
    started += 1
    await gate
    finished += 1
  })
  queue.enqueue("a")
  await Promise.resolve()
  assert.equal(started, 1)
  assert.equal(finished, 0)
  assert.equal(queue.size, 1)
  const drained = queue.drain()
  release()
  await drained
  assert.equal(finished, 1)
  assert.equal(queue.size, 0)
})

test("空队列 drain 立刻结束", async () => {
  const queue = new DrainableQueue<string>(async () => undefined)
  await queue.drain()
  assert.equal(queue.size, 0)
})
