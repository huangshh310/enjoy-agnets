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
const lastUsed = { id: "ws-last", name: "LastUsed", rootPath: "/tmp/last" }

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

test("S1-5 删到一个不剩时切换器和主区回到无项目空态", () => {
  resetPointer()
  seedWorkspacePointer({ workspace: created, repositories: [created] })
  seedWorkspacePointer({ repositories: [] })
  dropDanglingWorkspacePointer()
  settleWorkspaceAfterRemove([], created.id)
  syncBootWorkspace([], created.id, () => {
    throw new Error("空名单不得自动新建工作区")
  })
  const peek = peekWorkspacePointer()
  assert.equal(peek.workspaceId, null)
  assert.equal(peek.workspaceName, "No workspace")
  assert.equal(peek.workspaceRootPath, null)
  assert.equal(peek.sessionId, null)
})

test("S1-7 删当前还剩其他时切到 lastWorkspaceId，而不是名单第一个", () => {
  resetPointer()
  seedWorkspacePointer({ workspace: created, repositories: [created, leftover, lastUsed] })
  seedWorkspacePointer({ repositories: [leftover, lastUsed] })
  dropDanglingWorkspacePointer()
  settleWorkspaceAfterRemove([leftover, lastUsed], lastUsed.id)
  const peek = peekWorkspacePointer()
  assert.equal(peek.workspaceId, lastUsed.id)
  assert.equal(peek.workspaceName, lastUsed.name)
  assert.notEqual(peek.workspaceId, leftover.id)
  assert.notEqual(peek.workspaceId, created.id)
})

test("S1-7 没有可用 lastWorkspaceId 时切到剩余名单第一个", () => {
  resetPointer()
  seedWorkspacePointer({ workspace: created, repositories: [created, leftover] })
  seedWorkspacePointer({ repositories: [leftover] })
  dropDanglingWorkspacePointer()
  settleWorkspaceAfterRemove([leftover], created.id)
  const peek = peekWorkspacePointer()
  assert.equal(peek.workspaceId, leftover.id)
  assert.equal(peek.workspaceName, leftover.name)
})

test("S1-7 启动有项目无 last 时进第一个，不自动创建", () => {
  resetPointer()
  const first = { id: "ws-a", name: "A", rootPath: "/a" }
  const second = { id: "ws-b", name: "B", rootPath: "/b" }
  let loaded: string | null = null
  syncBootWorkspace([first, second], null, (row) => {
    loaded = row.id
    seedWorkspacePointer({ workspace: row, repositories: [first, second] })
  })
  assert.equal(loaded, first.id)
})

test("S1-7 启动有 last 时进 last，不是名单第一个", () => {
  resetPointer()
  const first = { id: "ws-a", name: "A", rootPath: "/a" }
  const second = { id: "ws-b", name: "B", rootPath: "/b" }
  let loaded: string | null = null
  syncBootWorkspace([first, second], second.id, (row) => {
    loaded = row.id
    seedWorkspacePointer({ workspace: row, repositories: [first, second] })
  })
  assert.equal(loaded, second.id)
})

test("启动 last 已失效时按 recentWorkspaceIds 顺序，不取名单第一个", () => {
  resetPointer()
  const first = { id: "ws-c", name: "C", rootPath: "/c" }
  const second = { id: "ws-a", name: "A", rootPath: "/a" }
  let loaded: string | null = null
  syncBootWorkspace(
    [first, second],
    "ws-gone",
    (row) => {
      loaded = row.id
      seedWorkspacePointer({ workspace: row, repositories: [first, second] })
    },
    ["ws-gone", "ws-a", "ws-c"]
  )
  assert.equal(loaded, second.id)
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
