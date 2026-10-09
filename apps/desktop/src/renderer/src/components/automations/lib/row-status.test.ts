import assert from "node:assert/strict"
import { test } from "node:test"
import type { Automation } from "@enjoy-agents/ipc-contract"
import { automationRowStatus } from "./row-status.ts"

function auto(patch: Partial<Automation>): Automation {
  return {
    id: "auto_1",
    name: "x",
    prompt: "y",
    trigger: "cron",
    enabled: true,
    updatedAt: 1,
    ...patch
  }
}

test("超时与重启打断不是红失败胶囊", () => {
  assert.equal(
    automationRowStatus(auto({ lastRunStatus: "failed", lastRunErrorCode: "catch_up_approval_timeout" })),
    "idle"
  )
  assert.equal(
    automationRowStatus(auto({ lastRunStatus: "failed", lastRunErrorCode: "interrupted_by_restart" })),
    "idle"
  )
  assert.equal(automationRowStatus(auto({ lastRunStatus: "failed" })), "failed")
  assert.equal(automationRowStatus(auto({ lastRunStatus: "skipped" })), "idle")
  assert.equal(automationRowStatus(auto({ lastRunStatus: "running" })), "running")
})
