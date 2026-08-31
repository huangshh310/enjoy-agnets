import assert from "node:assert/strict"
import { test } from "node:test"
import { toWorkspaceRelativePath } from "./knowledge-workspace-path.ts"

test("工作区内路径去掉根前缀，盘符大小写不影响", () => {
  assert.equal(toWorkspaceRelativePath("c:/proj/enjoy-agents", "c:/proj/enjoy-agents"), ".")
  assert.equal(
    toWorkspaceRelativePath("c:/proj/enjoy-agents", "C:/proj/enjoy-agents/design"),
    "design"
  )
  assert.equal(
    toWorkspaceRelativePath("C:/proj/enjoy-agents", "c:/proj/enjoy-agents/design/specs"),
    "design/specs"
  )
})

test("工作区外路径返回 null，不要留下绝对路径", () => {
  assert.equal(toWorkspaceRelativePath("c:/proj/enjoy-agents", "D:/other/design"), null)
})
