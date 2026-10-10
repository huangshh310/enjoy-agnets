import assert from "node:assert/strict"
import { test } from "node:test"
import { persistRuntimeId } from "./persist-runtime.ts"
import { useChatStore } from "../stores/chat-store.ts"

test("asDefault 写 preferredRuntimeId，即使已经是这台引擎", async () => {
  useChatStore.setState({
    runtimeId: "claude",
    sessionId: null,
    preferredRuntimeId: "enjoy-local"
  })
  await persistRuntimeId("claude", undefined, { asDefault: true })
  assert.equal(useChatStore.getState().preferredRuntimeId, "claude")
  assert.equal(useChatStore.getState().runtimeId, "claude")
})
