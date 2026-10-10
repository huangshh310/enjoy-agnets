/**
 * readFile 守卫：缺 workspaceId 必须在渲染层拦住，不能打 IPC。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { MissingWorkspaceIdError, requireWorkspaceId } from "./read-workspace-file.ts"

test("空 workspaceId 抛 MissingWorkspaceIdError，不放行", () => {
  assert.throws(() => requireWorkspaceId(undefined), MissingWorkspaceIdError)
  assert.throws(() => requireWorkspaceId(null), MissingWorkspaceIdError)
  assert.throws(() => requireWorkspaceId(""), MissingWorkspaceIdError)
  assert.throws(() => requireWorkspaceId("   "), MissingWorkspaceIdError)
})

test("有效 workspaceId 原样返回（去空白）", () => {
  assert.equal(requireWorkspaceId("ws-1"), "ws-1")
  assert.equal(requireWorkspaceId("  ws-2  "), "ws-2")
})
