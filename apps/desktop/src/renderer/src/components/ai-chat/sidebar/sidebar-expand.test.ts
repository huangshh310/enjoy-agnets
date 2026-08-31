import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isWorkspaceRowExpanded,
  shouldSwitchWorkspaceOnFolderClick
} from "./sidebar-expand.ts"

test("isWorkspaceRowExpanded 只认 expandedIds，不因当前工作区强制展开", () => {
  assert.equal(isWorkspaceRowExpanded("ws-a", ["ws-a"]), true)
  assert.equal(isWorkspaceRowExpanded("ws-a", []), false)
  assert.equal(isWorkspaceRowExpanded("ws-a", ["ws-b"]), false)
})

test("再次点击已展开的当前项目只收缩，不切换工作区", () => {
  assert.equal(shouldSwitchWorkspaceOnFolderClick("ws-a", "ws-a", true), false)
  assert.equal(shouldSwitchWorkspaceOnFolderClick("ws-a", "ws-a", false), false)
})

test("点击未展开的其他项目时才切换工作区", () => {
  assert.equal(shouldSwitchWorkspaceOnFolderClick("ws-b", "ws-a", false), true)
  assert.equal(shouldSwitchWorkspaceOnFolderClick("ws-b", "ws-a", true), false)
})
