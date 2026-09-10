import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatImplementationPlan,
  IMPLEMENTATION_PLAN_PATH,
  persistImplementationPlan
} from "./implementation-plan.ts"

test("计划正文和相对文件进 Markdown，逃逸路径丢掉", () => {
  const text = formatImplementationPlan("先读 host", ["src/a.ts", "../etc/passwd", "/abs", "ok/b.ts"])
  assert.match(text, /^# Implementation plan/)
  assert.match(text, /先读 host/)
  assert.match(text, /- src\/a\.ts/)
  assert.match(text, /- ok\/b\.ts/)
  assert.doesNotMatch(text, /\.\.\/etc/)
  assert.doesNotMatch(text, /\/abs/)
})

test("persist 写入固定路径；写失败仍回 path", async () => {
  const writes: Array<{ path: string; content: string }> = []
  const ok = await persistImplementationPlan(async (path, content) => {
    writes.push({ path, content })
  }, "步骤一")
  assert.equal(ok.path, IMPLEMENTATION_PLAN_PATH)
  assert.equal(ok.writeError, undefined)
  assert.equal(writes[0]?.path, "implementation_plan.md")
  assert.match(writes[0]?.content ?? "", /步骤一/)

  const failed = await persistImplementationPlan(async () => {
    throw new Error("disk full")
  }, "仍要提交")
  assert.equal(failed.path, IMPLEMENTATION_PLAN_PATH)
  assert.equal(failed.writeError, "disk full")
})
