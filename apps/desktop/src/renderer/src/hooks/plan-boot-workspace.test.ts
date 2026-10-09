/**
 * 启动对齐与删除收口走真实 chat-store。
 * 过期空名单不得抹掉刚创建的项目；删除当前/最后一个后指针必须离开已删 id。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { syncBootWorkspace } from "./plan-boot-workspace.ts"
import {
  dropDanglingWorkspacePointer,
  peekWorkspacePointer,
  seedWorkspacePointer,
  settleWorkspaceAfterRemove
} from "./workspace-pointer.ts"

const created = { id: "ws-new", name: "Flash", rootPath: "/tmp/flash" }
const leftover = { id: "ws-keep", name: "Keep", rootPath: "/tmp/keep" }

function resetPointer() {
  seedWorkspacePointer({ workspace: null, repositories: [] })
}

test("创建后 settings 带着空的旧名单时不得清掉新项目", () => {
  resetPointer()
  seedWorkspacePointer({ workspace: created, repositories: [created] })
  syncBootWorkspace([], "ws-old", () => {
    throw new Error("不得按旧名单再 load")
  })
  const peek = peekWorkspacePointer()
  assert.equal(peek.workspaceId, created.id)
  assert.equal(peek.workspaceName, created.name)
  assert.equal(peek.workspaceRootPath, created.rootPath)
})

test("删除最后一个项目、历史回落到路由页，然后 settings refetch 后 workspaceId 为空", () => {
  resetPointer()
  seedWorkspacePointer({ workspace: created, repositories: [created] })
  seedWorkspacePointer({ repositories: [] })
  dropDanglingWorkspacePointer()
  settleWorkspaceAfterRemove([])
  syncBootWorkspace([], created.id, () => {
    throw new Error("空名单且无指针时不得 load")
  })
  const peek = peekWorkspacePointer()
  assert.equal(peek.workspaceId, null)
  assert.equal(peek.workspaceName, "No workspace")
  assert.equal(peek.workspaceRootPath, null)
})

test("删除当前项目、还剩其他项目时不会停在已删除的 id 上", () => {
  resetPointer()
  seedWorkspacePointer({ workspace: created, repositories: [created, leftover] })
  seedWorkspacePointer({ repositories: [leftover] })
  dropDanglingWorkspacePointer()
  settleWorkspaceAfterRemove([leftover])
  syncBootWorkspace([leftover], created.id, () => {
    throw new Error("已有剩余项目指针时启动对齐不得再切")
  })
  const peek = peekWorkspacePointer()
  assert.equal(peek.workspaceId, leftover.id)
  assert.notEqual(peek.workspaceId, created.id)
  assert.equal(peek.workspaceName, leftover.name)
  assert.equal(peek.workspaceRootPath, leftover.rootPath)
})

test("启动还没有当前工作区时按 lastWorkspaceId 打开", () => {
  resetPointer()
  const workspace = { id: "ws1", name: "A", rootPath: "/a" }
  let loaded: string | null = null
  syncBootWorkspace([workspace], "ws1", (row) => {
    loaded = row.id
    seedWorkspacePointer({ workspace: row, repositories: [row] })
  })
  assert.equal(loaded, "ws1")
  assert.equal(peekWorkspacePointer().workspaceId, "ws1")
})
