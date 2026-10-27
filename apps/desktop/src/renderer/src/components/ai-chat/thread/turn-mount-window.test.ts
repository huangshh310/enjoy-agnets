import assert from "node:assert/strict"
import { test } from "node:test"
import { EAGER_THREAD_TAIL, shouldMountThreadTurn } from "./turn-mount-window.ts"

test("长线程首屏只挂末尾几轮", () => {
  const mounted: number[] = []
  for (let index = 0; index < 20; index += 1) {
    if (shouldMountThreadTurn({ index, count: 20, revealed: false, near: false, streaming: false })) {
      mounted.push(index)
    }
  }
  assert.deepEqual(mounted, [12, 13, 14, 15, 16, 17, 18, 19])
  assert.equal(mounted.length, EAGER_THREAD_TAIL)
})

test("短线程、靠近视口、查找点到、正在流式的轮都要挂", () => {
  assert.equal(shouldMountThreadTurn({ index: 0, count: 3, revealed: false, near: false, streaming: false }), true)
  assert.equal(shouldMountThreadTurn({ index: 0, count: 20, revealed: false, near: true, streaming: false }), true)
  assert.equal(shouldMountThreadTurn({ index: 0, count: 20, revealed: true, near: false, streaming: false }), true)
  assert.equal(shouldMountThreadTurn({ index: 1, count: 20, revealed: false, near: false, streaming: true }), true)
})
