/**
 * 创建项目后列表必须还在：启动对齐不得用旧空 query 清掉刚 hydrate 的项目。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { planBootWorkspace, syncBootWorkspace } from "./plan-boot-workspace.ts"
import { useChatStore } from "../stores/chat-store.ts"

const created = { id: "ws-new", name: "Flash", rootPath: "/tmp/flash" }

test("创建后 settings 带着空的旧 workspaces 名单时不得清掉新项目", () => {
  useChatStore.setState({
    workspaceId: created.id,
    workspaceName: created.name,
    workspaceRootPath: created.rootPath,
    repositories: [],
    expandedIds: []
  })
  useChatStore.getState().hydrateWorkspacesAndSessions(
    [{ workspace: created, sessions: [] }],
    created.id
  )

  let loaded: string | null = null
  syncBootWorkspace([], "ws-old", (workspace) => {
    loaded = workspace.id
    useChatStore.getState().setWorkspace(workspace)
  })

  assert.equal(loaded, null)
  assert.equal(useChatStore.getState().workspaceId, created.id)
  assert.ok(
    useChatStore.getState().repositories.some((node) => node.id === created.id && node.kind === "workspace")
  )
})

test("启动时空名单且 store 也空才清当前工作区", () => {
  const plan = planBootWorkspace({
    workspaces: [],
    lastWorkspaceId: null,
    currentWorkspaceId: null,
    hasLiveWorkspace: false
  })
  assert.equal(plan.action, "clear")
})

test("启动还没有当前工作区时按 lastWorkspaceId 打开", () => {
  const workspace = { id: "ws1", name: "A", rootPath: "/a" }
  const plan = planBootWorkspace({
    workspaces: [workspace],
    lastWorkspaceId: "ws1",
    currentWorkspaceId: null,
    hasLiveWorkspace: false
  })
  assert.equal(plan.action, "load")
  if (plan.action === "load") assert.equal(plan.workspace.id, "ws1")
})
