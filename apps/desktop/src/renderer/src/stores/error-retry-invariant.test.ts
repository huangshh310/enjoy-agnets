/**
 * #147 后续：errorRetry 的清理收口在 store 写入口（reducer / setState 都过），不靠组件散点清。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { reconcileErrorRetry } from "./error-retry-invariant.ts"

const { useChatStore } = await import("./chat-store.ts")
const target = { kind: "regenerate" as const, sessionId: "ses_inv", userId: "u1" }

test("reconcileErrorRetry：error 清空或换文本 → 目标作废；同一条 error → 保留", () => {
  const keep = { error: "boom", errorRetry: { error: "boom" } }
  assert.equal(reconcileErrorRetry(keep), keep)
  assert.equal(reconcileErrorRetry({ error: null, errorRetry: { error: "boom" } }).errorRetry, null)
  assert.equal(reconcileErrorRetry({ error: "429", errorRetry: { error: "boom" } }).errorRetry, null)
})

test("stream reducer 把 error 置空（run.start 等）时 errorRetry 跟着清，无需组件手动清", () => {
  useChatStore.getState().setError("boom", target)
  assert.equal(useChatStore.getState().errorRetry?.error, "boom")
  // run.end 的 reducer 补丁把 error 置空：errorRetry 必须跟着清（不靠组件手动清）。
  useChatStore.setState({ running: true, runId: "run_inv_1" })
  useChatStore.getState().applyStreamEvent({ type: "run.end", runId: "run_inv_1" } as never)
  assert.equal(useChatStore.getState().error, null)
  assert.equal(useChatStore.getState().errorRetry, null)
  useChatStore.getState().setError("boom", target)
  useChatStore.setState({ error: null })
  assert.equal(useChatStore.getState().errorRetry, null)
  useChatStore.getState().setError("boom", target)
  useChatStore.setState({ error: "other" })
  assert.equal(useChatStore.getState().errorRetry, null)
  useChatStore.getState().setError("boom", target)
  useChatStore.setState({ messages: [] })
  assert.equal(useChatStore.getState().errorRetry?.error, "boom")
})
