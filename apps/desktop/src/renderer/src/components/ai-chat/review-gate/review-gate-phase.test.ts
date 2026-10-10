import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { claimDoneForcesReview, reviewGatePhase, workflowAfterStreamEvent } from "./review-gate-phase.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("运行中盖过待验收 / 完成", () => {
  assert.equal(reviewGatePhase({ running: true, workflowStatus: "needs_review" }), "running")
  assert.equal(reviewGatePhase({ running: true, workflowStatus: "done" }), "running")
})

test("停泵后按 workflowStatus 进人闸或完成", () => {
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "needs_review" }), "needs_review")
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "done" }), "done")
})

test("todo / in_progress / 空不画顶栏铬", () => {
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "todo" }), null)
  assert.equal(reviewGatePhase({ running: false, workflowStatus: "in_progress" }), null)
  assert.equal(reviewGatePhase({ running: false, workflowStatus: null }), null)
})

test("宣称收工必须进待验收；失败 / 开跑不走这扇门", () => {
  assert.equal(claimDoneForcesReview("run.end"), true)
  assert.equal(claimDoneForcesReview("run.error"), false)
  assert.equal(claimDoneForcesReview("run.start"), false)
})

test("流事件分流：成功待验收，失败/开跑回执行中", () => {
  assert.equal(workflowAfterStreamEvent("run.end"), "needs_review")
  assert.equal(workflowAfterStreamEvent("run.end", { deniedOnly: true }), "todo")
  assert.equal(workflowAfterStreamEvent("run.error"), "in_progress")
  assert.equal(workflowAfterStreamEvent("run.start"), "in_progress")
  assert.equal(workflowAfterStreamEvent("text.delta"), null)
})

test("有 turn 时只信 main：只读回待办，出错不进待验收", () => {
  assert.equal(
    workflowAfterStreamEvent("run.end", { turn: { workflow: "todo", attention: "complete" } }),
    "todo"
  )
  assert.equal(
    workflowAfterStreamEvent("run.error", { turn: { workflow: "in_progress", attention: "error" } }),
    "in_progress"
  )
})

test("sync 按结束原因分流，废止一律 needs_review，不看写盘 path", () => {
  const sync = readFileSync(join(dir, "sync-review-gate.ts"), "utf8")
  assert.ok(sync.includes("workflowAfterStreamEvent"))
  assert.ok(!sync.includes('if (!claimDoneForcesReview(event.type)) return'))
  assert.ok(!sync.includes("pathsFromLastTurn"))
  assert.ok(!sync.includes("runNeedsHumanReview"))
})

test("打回 / 通过不调用 git commit 或 push", () => {
  const actions = readFileSync(join(dir, "review-gate-actions.ts"), "utf8")
  assert.ok(actions.includes("in_progress"))
  assert.ok(actions.includes('"done"'))
  assert.ok(!actions.includes("gitCommit"))
  assert.ok(!actions.includes("git_commit"))
  assert.ok(!actions.includes("gitPush"))
  assert.ok(!actions.includes("git_push"))
})
