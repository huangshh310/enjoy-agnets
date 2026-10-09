import assert from "node:assert/strict"
import { test } from "node:test"
import { claimRestoreRunningOnce, claimRestoreWaitingOnce } from "./restore-once.ts"

test("restoreRunning / restoreWaiting 每个进程只领取一次", () => {
  assert.equal(claimRestoreRunningOnce(), true)
  assert.equal(claimRestoreRunningOnce(), false)
  assert.equal(claimRestoreWaitingOnce(), true)
  assert.equal(claimRestoreWaitingOnce(), false)
})
