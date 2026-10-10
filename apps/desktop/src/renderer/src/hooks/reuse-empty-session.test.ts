import assert from "node:assert/strict"
import { test } from "node:test"
import { clearComposerAssets, queueComposerAsset } from "./composer-assets.ts"
import { isReusableEmptySession } from "./reuse-empty-session.ts"

function store(partial: {
  sessionId?: string | null
  workspaceId?: string | null
  sessionTitle?: string
  messages?: Array<{ role: "user" | "assistant" }>
}) {
  return {
    sessionId: "sessionId" in partial ? (partial.sessionId ?? null) : "ses_empty",
    workspaceId: "workspaceId" in partial ? (partial.workspaceId ?? null) : "ws_a",
    sessionTitle: partial.sessionTitle ?? "新对话",
    messages: (partial.messages ?? []) as never
  }
}

test("当前空会话（默认题、无用户句、无附件）可复用", () => {
  clearComposerAssets()
  assert.equal(isReusableEmptySession(store({}), "ws_a"), true)
  assert.equal(isReusableEmptySession(store({ sessionTitle: "New agent" }), "ws_a"), true)
})

test("有用户句、改过标题、换项目或无当前会话则不复用", () => {
  clearComposerAssets()
  assert.equal(
    isReusableEmptySession(store({ messages: [{ role: "user" }] }), "ws_a"),
    false
  )
  assert.equal(isReusableEmptySession(store({ sessionTitle: "修登录" }), "ws_a"), false)
  assert.equal(isReusableEmptySession(store({}), "ws_other"), false)
  assert.equal(isReusableEmptySession(store({ sessionId: null }), "ws_a"), false)
})

test("Composer 已有附件则不复用（第一条附件即落库，归 BASE-P0-3）", () => {
  clearComposerAssets()
  queueComposerAsset("asset_1", "shot.png")
  assert.equal(isReusableEmptySession(store({}), "ws_a"), false)
  clearComposerAssets()
})
