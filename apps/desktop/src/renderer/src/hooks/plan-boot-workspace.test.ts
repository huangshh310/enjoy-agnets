/**
 * 创建项目后列表必须还在：启动对齐不得用旧空 query 清掉刚 hydrate 的项目。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { planBootWorkspace } from "./plan-boot-workspace.ts"

const created = { id: "ws-new", name: "Flash", rootPath: "/tmp/flash" }

test("创建后 settings 带着空的旧 workspaces 名单时不得清掉新项目", () => {
  const plan = planBootWorkspace({
    workspaces: [],
    lastWorkspaceId: "ws-old",
    currentWorkspaceId: created.id,
    hasLiveWorkspace: true
  })
  const repositories = plan.action === "clear" ? [] : [created.id]
  assert.equal(plan.action, "noop")
  assert.deepEqual(repositories, [created.id])
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
