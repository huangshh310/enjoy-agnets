/**
 * S1-7：切换必须走 rememberWorkspaceUse，删除后按 MRU 而不是名单第一个。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  nextWorkspaceIdAfterRemove,
  rememberWorkspaceUse,
  shouldRememberWorkspaceOnRun,
  RECENT_WORKSPACE_SETTING
} from "./workspace-mru.ts"

function memoryStore(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init))
  return {
    get: (key: string) => data.get(key),
    set: (key: string, value: string) => {
      data.set(key, value)
    }
  }
}

test("S1-7 按 A→B 切换后删 B 切到 A，不是名单第一个", () => {
  const store = memoryStore()
  rememberWorkspaceUse("ws-c", store)
  rememberWorkspaceUse("ws-a", store)
  rememberWorkspaceUse("ws-b", store)
  assert.equal(store.get("lastWorkspaceId"), "ws-b")
  const remaining = ["ws-c", "ws-a"]
  const next = nextWorkspaceIdAfterRemove("ws-b", remaining, store)
  assert.equal(next, "ws-a")
  assert.notEqual(next, remaining[0])
  assert.equal(store.get("lastWorkspaceId"), "ws-a")
  assert.ok(!store.get(RECENT_WORKSPACE_SETTING)?.includes("ws-b"))
})

test("MRU 都没有时才回落名单第一个", () => {
  const store = memoryStore()
  const next = nextWorkspaceIdAfterRemove("ws-b", ["ws-c", "ws-a"], store)
  assert.equal(next, "ws-c")
})

test("只有前台用户开跑才写 MRU", () => {
  assert.equal(shouldRememberWorkspaceOnRun({}), true)
  assert.equal(shouldRememberWorkspaceOnRun({ automationSource: { id: "auto" } }), false)
  assert.equal(shouldRememberWorkspaceOnRun({ isResume: true }), false)
  assert.equal(shouldRememberWorkspaceOnRun({ isHeartbeat: true }), false)
})
