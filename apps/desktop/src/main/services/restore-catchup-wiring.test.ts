/**
 * restore / 单实例启动接线改走行为测试，见 watch-catchup-settle-behavior 与 single-instance。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { startPrimaryOrExit } from "./single-instance.ts"

test("拿不到单实例锁时不启动调度", () => {
  let started = 0
  let exited = -1
  const ok = startPrimaryOrExit(
    {
      requestSingleInstanceLock: () => false,
      on() {},
      exit: (code?: number) => {
        exited = code ?? 0
      }
    },
    () => undefined,
    () => {
      started += 1
    }
  )
  assert.equal(ok, false)
  assert.equal(started, 0)
  assert.equal(exited, 0)
})
