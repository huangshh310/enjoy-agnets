import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import {
  applyDefaultChatRouteTo,
  type DefaultChatRouteStore
} from "./apply-default-chat-route.ts"

function fakeStore(partial: Partial<DefaultChatRouteStore> = {}): DefaultChatRouteStore {
  const store: DefaultChatRouteStore = {
    sessionId: "sess",
    runtimeId: "enjoy-local",
    preferredRuntimeId: "enjoy-local",
    sessionRuntimes: {},
    modelId: "",
    modelLabel: "",
    setPreferredRuntimeId: (id) => {
      store.preferredRuntimeId = id
    },
    setPreferredModelId: () => undefined,
    setRuntimeId: (id) => {
      store.runtimeId = id
    },
    setModel: (id) => {
      store.modelId = id
    },
    ...partial
  }
  return store
}

function claudeSnap() {
  return buildChatReadiness({
    engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
    localModels: [],
    apiKeys: [],
    engineCount: 1
  })
}

test("出厂会话会跟上第一次默认路线", () => {
  const store = fakeStore()
  applyDefaultChatRouteTo(claudeSnap(), store)
  assert.equal(store.runtimeId, "claude")
  assert.equal(store.preferredRuntimeId, "claude")
})

test("本会话 Picker 选择不会被默认路线打回去", () => {
  const store = fakeStore({
    runtimeId: "cursor",
    preferredRuntimeId: "claude",
    sessionRuntimes: {}
  })
  applyDefaultChatRouteTo(claudeSnap(), store)
  assert.equal(store.runtimeId, "cursor")
  assert.equal(store.preferredRuntimeId, "claude")
})

test("已绑定会话覆盖时只改新对话默认", () => {
  const store = fakeStore({
    runtimeId: "cursor",
    preferredRuntimeId: "enjoy-local",
    sessionRuntimes: { sess: "cursor" }
  })
  applyDefaultChatRouteTo(claudeSnap(), store)
  assert.equal(store.runtimeId, "cursor")
  assert.equal(store.preferredRuntimeId, "claude")
})
