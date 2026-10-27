/**
 * 噪声路径必须在发出 workspace.changed 之前丢掉。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isIgnoredWorkspaceEventPath } from "./workspace-event-path.ts"

test("node_modules 与构建目录不刷新工作区", () => {
  assert.equal(isIgnoredWorkspaceEventPath("src/a.ts"), false)
  assert.equal(isIgnoredWorkspaceEventPath("node_modules/vite/dist/client.js"), true)
  assert.equal(isIgnoredWorkspaceEventPath(".git/objects/ab"), true)
  assert.equal(isIgnoredWorkspaceEventPath("apps/desktop/dist/index.js"), true)
  assert.equal(isIgnoredWorkspaceEventPath("coverage/index.html"), true)
  assert.equal(isIgnoredWorkspaceEventPath(".turbo/cache"), true)
  assert.equal(isIgnoredWorkspaceEventPath(".next/cache/webpack"), true)
  assert.equal(isIgnoredWorkspaceEventPath("build/main.js"), true)
})

test("Windows 指纹的整树信号仍然有效", () => {
  assert.equal(isIgnoredWorkspaceEventPath("."), false)
  assert.equal(isIgnoredWorkspaceEventPath(""), false)
  assert.equal(isIgnoredWorkspaceEventPath("src\\a.ts"), false)
  assert.equal(isIgnoredWorkspaceEventPath("node_modules\\pkg\\index.js"), true)
})
