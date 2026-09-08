import assert from "node:assert/strict"
import { test } from "node:test"
import { planFromPending } from "./plan-from-pending.ts"

const verbs = { write: "写入", edit: "编辑", commit: "提交" }

test("git_commit 用提交说明当标题，不展开 diff", () => {
  const plan = planFromPending("git_commit", { message: "fix auth" }, "（空）", verbs)
  assert.equal(plan.headline, "fix auth")
  assert.equal(plan.steps[0]?.title, "提交")
  assert.equal(plan.steps[0]?.detail, "fix auth")
  assert.equal(plan.showDiff, false)
})

test("write_file 用文件名当标题，步骤带路径详情", () => {
  const plan = planFromPending("write_file", { path: "src/a.ts" }, "（空）", verbs)
  assert.equal(plan.headline, "a.ts")
  assert.equal(plan.steps[0]?.title, "写入 a.ts")
  assert.equal(plan.steps[0]?.detail, "src/a.ts")
  assert.equal(plan.showDiff, true)
})

test("edit_file 步骤带编辑动词", () => {
  const plan = planFromPending("edit_file", { file_path: "b.ts" }, "（空）", verbs)
  assert.equal(plan.headline, "b.ts")
  assert.equal(plan.steps[0]?.title, "编辑 b.ts")
})
