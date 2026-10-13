import assert from "node:assert/strict"
import { test } from "node:test"
import { retryTargetFromMessages } from "./hydrate-session-error.ts"

test("重试目标绑最后一条用户话", () => {
  assert.deepEqual(
    retryTargetFromMessages("ses_1", [
      { id: "u1", role: "user", content: "先发" },
      { id: "a1", role: "assistant", content: "" },
      { id: "u2", role: "user", content: "后发" }
    ]),
    { kind: "regenerate", sessionId: "ses_1", userId: "u2" }
  )
  assert.equal(retryTargetFromMessages("ses_1", [{ id: "a1", role: "assistant", content: "x" }]), null)
})

test("leo：关红卡落库（session.dismissError），重启不再还原；横幅关闭按钮走它", async () => {
  const { readFileSync } = await import("node:fs")
  const banner = readFileSync(
    new URL("../components/ai-chat/thread/thread-error-banner.tsx", import.meta.url),
    "utf8"
  )
  assert.match(banner, /onClick=\{dismissSessionErrorCard\}/)
  const calls: unknown[] = []
  ;(globalThis as { window?: unknown }).window = {
    ide: { session: { dismissError: (input: unknown) => (calls.push(input), Promise.resolve(true)) } }
  }
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { dismissSessionErrorCard } = await import("./hydrate-session-error.ts")
    useChatStore.setState({ sessionId: "ses_x" } as never)
    useChatStore.getState().setError("boom")
    dismissSessionErrorCard()
    assert.equal(useChatStore.getState().error, null)
    assert.deepEqual(calls, [{ sessionId: "ses_x" }])
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})
