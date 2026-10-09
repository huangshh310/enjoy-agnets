import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { shouldEmitRunEnd, USER_ABORT_MESSAGE } from "./claim-run-end.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("宣称收工才发 run.end", () => {
  assert.equal(shouldEmitRunEnd({ aborted: false, timedOut: false }), true)
})

test("用户取消 / abort 不得发 run.end", () => {
  assert.equal(shouldEmitRunEnd({ aborted: true, timedOut: false }), false)
  assert.equal(shouldEmitRunEnd({ aborted: false, timedOut: false, userCancelled: true }), false)
})

test("超时不得发 run.end", () => {
  assert.equal(shouldEmitRunEnd({ aborted: true, timedOut: true }), false)
  assert.equal(shouldEmitRunEnd({ aborted: false, timedOut: true }), false)
})

test("取消文案含 abort，供 Inbox 失败筛标已取消", () => {
  assert.equal(USER_ABORT_MESSAGE, "Aborted by user.")
  assert.ok(USER_ABORT_MESSAGE.toLowerCase().includes("abort"))
})

test("abortAgent 发 run.error 并标 userCancelled，不发 run.end", () => {
  const runner = readFileSync(join(dir, "agent-runner.ts"), "utf8")
  assert.ok(runner.includes("userCancelled = true"))
  assert.ok(runner.includes("USER_ABORT_MESSAGE"))
  assert.ok(runner.includes('type: "run.error"'))
  assert.ok(!runner.includes('type: "run.end"'))
  assert.ok(runner.includes("cancelInFlightDesktopAct"))
  const decide = readFileSync(join(dir, "decide-approval.ts"), "utf8")
  assert.ok(decide.includes("runWithActiveRunId"))
  const pump = readFileSync(join(dir, "agent-pump.ts"), "utf8")
  assert.ok(pump.includes("shouldEmitRunEnd"))
  assert.ok(pump.includes("failAgentPump"))
  assert.ok(pump.includes("runWithActiveRunId"))
})
