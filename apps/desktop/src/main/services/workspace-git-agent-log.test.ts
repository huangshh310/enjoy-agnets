/**
 * Agent git_log 参数：钳制条数、可选路径，不造分支图。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { gitLogCommandArgs } from "./workspace-git-agent-log.ts"

test("默认 20 条线性 pretty，不带路径", () => {
  assert.deepEqual(gitLogCommandArgs(), [
    "log",
    "--max-count=20",
    "--pretty=format:%h %ad %an %s",
    "--date=short"
  ])
})

test("limit 钳到 1–100，空白 path 忽略", () => {
  assert.equal(gitLogCommandArgs({ limit: 0 })[1], "--max-count=1")
  assert.equal(gitLogCommandArgs({ limit: 400 })[1], "--max-count=100")
  assert.ok(!gitLogCommandArgs({ path: "  " }).includes("--"))
})

test("有 path 时追加 -- path", () => {
  const args = gitLogCommandArgs({ limit: 8, path: "src/main.ts" })
  assert.deepEqual(args.slice(-2), ["--", "src/main.ts"])
  assert.equal(args[1], "--max-count=8")
})
