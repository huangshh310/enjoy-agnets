import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { useChatStore } from "../stores/chat-store.ts"
import { applyDefaultChatRoute } from "./apply-default-chat-route.ts"

test.beforeEach(() => {
  useChatStore.setState({
    sessionId: "sess",
    runtimeId: "enjoy-local",
    preferredRuntimeId: "enjoy-local",
    sessionRuntimes: {},
    modelId: "",
    preferredModelId: ""
  })
})

test("出厂会话会跟上第一次默认路线", () => {
  applyDefaultChatRoute(
    buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [],
      apiKeys: [],
      engineCount: 1
    })
  )
  assert.equal(useChatStore.getState().runtimeId, "claude")
  assert.equal(useChatStore.getState().preferredRuntimeId, "claude")
})

test("本会话 Picker 选择不会被默认路线打回去", () => {
  useChatStore.setState({
    runtimeId: "cursor",
    preferredRuntimeId: "claude",
    sessionId: "sess",
    sessionRuntimes: {}
  })
  applyDefaultChatRoute(
    buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [],
      apiKeys: [],
      engineCount: 1
    })
  )
  assert.equal(useChatStore.getState().runtimeId, "cursor")
  assert.equal(useChatStore.getState().preferredRuntimeId, "claude")
})

test("已绑定会话覆盖时只改新对话默认", () => {
  useChatStore.setState({
    sessionId: "sess",
    runtimeId: "cursor",
    preferredRuntimeId: "enjoy-local",
    sessionRuntimes: { sess: "cursor" }
  })
  applyDefaultChatRoute(
    buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [],
      apiKeys: [],
      engineCount: 1
    })
  )
  assert.equal(useChatStore.getState().runtimeId, "cursor")
  assert.equal(useChatStore.getState().preferredRuntimeId, "claude")
})
