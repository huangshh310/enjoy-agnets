/**
 * restore / 单实例启动接线：行为 + 生产文件真实符号。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { startPrimaryOrExit } from "./single-instance.ts"

const dir = dirname(fileURLToPath(import.meta.url))

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

test("index 把 restore 挂在首窗 did-finish-load，单实例走 startPrimaryOrExit", () => {
  const index = readFileSync(join(dir, "../index.ts"), "utf8")
  assert.match(index, /startPrimaryOrExit/)
  assert.match(index, /scheduleOrphanRestoreAfterLoad/)
  assert.doesNotMatch(index, /restoreOrphansOnce\(createWindow\(\)\)/)
  assert.match(readFileSync(join(dir, "restore-waiting-runs.ts"), "utf8"), /claimRestoreWaitingOnce/)
  assert.match(readFileSync(join(dir, "restore-running-runs.ts"), "utf8"), /claimRestoreRunningOnce/)
  assert.match(readFileSync(join(dir, "restore-after-load.ts"), "utf8"), /did-finish-load/)
})
