/**
 * Tool Chips 文件胶囊：路径才进胶囊，命令行参数不要。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { fileChangesFromRows, looksLikeFilePath } from "./thinking-chips.ts"

test("looksLikeFilePath 认扩展名和斜杠，拒绝带空格的命令", () => {
  assert.equal(looksLikeFilePath("flavors.css"), true)
  assert.equal(looksLikeFilePath("src/ChurnSchedule.tsx"), true)
  assert.equal(looksLikeFilePath("pnpm run freeze"), false)
  assert.equal(looksLikeFilePath(""), false)
})

test("fileChangesFromRows 只收集编码步骤的文件增减", () => {
  const rows = [
    { secondary: "Planning", done: true },
    {
      mono: true,
      secondary: "ChurnSchedule.tsx",
      add: 74,
      del: 41
    },
    {
      mono: true,
      secondary: "pnpm run freeze"
    }
  ]
  assert.deepEqual(fileChangesFromRows(rows), [
    { path: "ChurnSchedule.tsx", additions: 74, deletions: 41 }
  ])
})
