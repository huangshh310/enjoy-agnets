/**
 * 审查栏单元测试：
 * 验证层级文件树构建 (buildFileTree)、搜索过滤、审查作用域以及默认偏好配置。
 */

import test from "node:test"
import assert from "node:assert/strict"
import { buildFileTree } from "./file-tree/build-file-tree.ts"
import { REVIEW_SCOPES, DEFAULT_REVIEW_OPTIONS } from "./constants/review-constants.ts"
type ChangedFileRow = {
  path: string
  status: "added" | "modified" | "deleted" | "untracked"
  additions: number
  deletions: number
}

test("buildFileTree: 能将扁平文件路径构建为层级目录树并目录优先", () => {
  const mockFiles: ChangedFileRow[] = [
    { path: "src/renderer/index.ts", status: "modified", additions: 10, deletions: 2 },
    { path: "src/main/main.ts", status: "added", additions: 50, deletions: 0 },
    { path: "package.json", status: "modified", additions: 1, deletions: 1 }
  ]

  const tree = buildFileTree(mockFiles)

  // 顶级应为 src 目录和 package.json 文件，且目录排在前面
  assert.equal(tree.length, 2)
  assert.equal(tree[0].name, "src")
  assert.equal(tree[0].isDir, true)
  assert.equal(tree[1].name, "package.json")
  assert.equal(tree[1].isDir, false)

  // 深入检查 src 子目录
  const srcChildren = tree[0].children ?? []
  assert.equal(srcChildren.length, 2)
  assert.equal(srcChildren[0].name, "main")
  assert.equal(srcChildren[1].name, "renderer")
})

test("buildFileTree: 支持通过搜索词进行文件过滤", () => {
  const mockFiles: ChangedFileRow[] = [
    { path: "apps/desktop/src/main.ts", status: "modified", additions: 5, deletions: 1 },
    { path: "packages/ui/button.tsx", status: "added", additions: 20, deletions: 0 },
    { path: "packages/ui/dialog.tsx", status: "modified", additions: 8, deletions: 3 }
  ]

  // 搜索 "dialog"
  const filtered = buildFileTree(mockFiles, "dialog")
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].name, "packages")

  const uiDir = filtered[0].children?.[0]
  assert.equal(uiDir?.name, "ui")
  assert.equal(uiDir?.children?.length, 1)
  assert.equal(uiDir?.children?.[0].name, "dialog.tsx")
})

test("REVIEW_SCOPES: 必须包含完整的 7 个审查作用域", () => {
  const scopeIds = REVIEW_SCOPES.map((s) => s.id)
  assert.deepEqual(scopeIds, [
    "last-turn",
    "uncommitted",
    "unstaged",
    "staged",
    "commits",
    "branch",
    "checkpoints"
  ])
})

test("DEFAULT_REVIEW_OPTIONS: 默认启用文件树并设为统一 Diff 流", () => {
  assert.equal(DEFAULT_REVIEW_OPTIONS.fileTreeVisible, true)
  assert.equal(DEFAULT_REVIEW_OPTIONS.diffLayout, "unified")
  assert.equal(DEFAULT_REVIEW_OPTIONS.viewMode, "stream")
})
