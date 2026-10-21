/**
 * mike P3（#163 巡检）：非 Git 文件夹底栏不写「未检出分支 / No branch」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { statusBranchLabel } from "./status-branch-label.ts"

test("非 Git（current 空、没有分支）/ 还没查到：不画", () => {
  assert.equal(statusBranchLabel({ current: "", branches: [] }, "未检出分支"), null)
  assert.equal(statusBranchLabel(undefined, "未检出分支"), null)
  assert.equal(statusBranchLabel(null, "未检出分支"), null)
})

test("Git：有当前分支写分支名；HEAD 游离（有分支、当前不在分支上）才写「未检出分支」", () => {
  assert.equal(statusBranchLabel({ current: " main ", branches: [{}] }, "未检出分支"), "main")
  assert.equal(statusBranchLabel({ current: "", branches: [{}, {}] }, "未检出分支"), "未检出分支")
})

test("接线：分支按钮 label 为 null 时整颗不画", () => {
  const src = readFileSync(new URL("./status-branch-picker.tsx", import.meta.url), "utf8")
  assert.match(src, /const label = statusBranchLabel\(branchesQuery\.data, t\("chat\.gitNoBranch"\)\)\n\s+if \(label == null\) return null/)
})
