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
  assert.match(banner, /dismissSessionErrorCard\(\{ onPersistFailed/)
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

/** 桥桩：session.lastError 按「库」返回；dismissError 落水位后 lastError 返回 null（模拟 #150 runs 表 + 水位）。 */
function stubIde(db: Record<string, string | null>, calls: unknown[] = []) {
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        lastError: async ({ sessionId }: { sessionId: string }) =>
          db[sessionId] ? { runId: `run_${sessionId}`, message: db[sessionId] } : null,
        dismissError: async (input: { sessionId: string }) => {
          calls.push(input)
          db[input.sessionId] = null
          return true
        }
      },
      inbox: { putStates: async () => ({ ok: true }) }
    }
  }
}

test("#151：关红卡同时把本会话 Attention 出错槽标 dismissed（红点 / 待处理条 / 收件箱一起消失）", async () => {
  const calls: unknown[] = []
  stubIde({ a: "boom-a" }, calls)
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
    const { dismissSessionErrorCard } = await import("./hydrate-session-error.ts")
    const { sessionFailed } = await import("../components/ai-chat/sidebar/session-activity.ts")
    useAttentionStore.setState({
      items: [
        { id: "a:error", sessionId: "a", kind: "error", status: "active", runId: "r", occurredAt: 1, summary: "x", sessionTitle: "a" },
        { id: "b:error", sessionId: "b", kind: "error", status: "active", runId: "r", occurredAt: 1, summary: "y", sessionTitle: "b" }
      ]
    } as never)
    useChatStore.setState({ sessionId: "a" } as never)
    useChatStore.getState().setError("boom-a")
    dismissSessionErrorCard()
    const items = useAttentionStore.getState().items
    assert.equal(items.find((i) => i.id === "a:error")?.status, "dismissed")
    assert.equal(items.find((i) => i.id === "b:error")?.status, "active")
    assert.equal(sessionFailed("a", items), false)
    assert.deepEqual(calls, [{ sessionId: "a", runId: "r" }])
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})

test("跨层：真 applySessionHydrate + restoreSessionErrorFromDb——A 有错 / B 无错不串；关掉后切回 / 重启都不复活", async () => {
  const db: Record<string, string | null> = { a: "boom-a", b: null }
  stubIde(db)
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
    const { applySessionHydrate } = await import("./session-hydrate.ts")
    const { bumpSessionHydrateGeneration } = await import("./session-hydrate-generation.ts")
    const { restoreSessionErrorFromDb, dismissSessionErrorCard } = await import("./hydrate-session-error.ts")
    useAttentionStore.setState({
      items: [{ id: "a:error", sessionId: "a", kind: "error", status: "active", runId: "r", occurredAt: 1, summary: "x", sessionTitle: "a" }],
      parks: {}
    } as never)
    // 模拟 loadSession：setSession → applySessionHydrate → restoreSessionErrorFromDb。
    const open = async (sessionId: string, sameSession = false) => {
      useChatStore.getState().setSession(sessionId, sessionId)
      const ok = applySessionHydrate({
        dbRows: [],
        sameSession,
        generation: bumpSessionHydrateGeneration(),
        sessionId,
        sessionRunning: false
      })
      assert.equal(ok, true)
      await restoreSessionErrorFromDb(sessionId, { running: false, messages: useChatStore.getState().messages })
    }
    await open("a")
    assert.equal(useChatStore.getState().error, "boom-a")
    // Attention 还挂着 A 的出错，但 applySessionHydrate 不再用它写红卡：B 干净。
    await open("b")
    assert.equal(useChatStore.getState().error, null)
    await open("a")
    assert.equal(useChatStore.getState().error, "boom-a")
    // 关掉：切走再切回不复活。
    dismissSessionErrorCard()
    await open("b")
    await open("a")
    assert.equal(useChatStore.getState().error, null)
    assert.equal(useAttentionStore.getState().items[0]!.status, "dismissed")
    // 「重启」：内存全清，Attention 空，只剩库（水位已落）。
    useAttentionStore.setState({ items: [], parks: {} } as never)
    useChatStore.setState({ sessionId: null, error: null } as never)
    await open("a")
    assert.equal(useChatStore.getState().error, null)
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})

test("leo #151：关卡落库失败重试一次，仍失败才出 toast；第二次成功不出", async () => {
  const { persistErrorDismiss } = await import("./hydrate-session-error.ts")
  let n = 0
  let toasts = 0
  const flaky = { session: { dismissError: () => (++n === 1 ? Promise.reject(new Error("x")) : Promise.resolve(true)) } }
  assert.equal(await persistErrorDismiss(flaky, { sessionId: "s" }, () => toasts++), true)
  assert.equal(n, 2)
  assert.equal(toasts, 0)
  n = 0
  const dead = { session: { dismissError: () => (n++, Promise.resolve(false)) } }
  assert.equal(await persistErrorDismiss(dead, { sessionId: "s" }, () => toasts++), false)
  assert.equal(n, 2)
  assert.equal(toasts, 1)
})

test("leo #151：关卡带上还原时的 runId（kai 的 session.dismissError 接受 runId）", async () => {
  const calls: unknown[] = []
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        lastError: () => Promise.resolve({ runId: "run_9", message: "boom" }),
        dismissError: (input: unknown) => (calls.push(input), Promise.resolve(true))
      }
    }
  }
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { restoreSessionErrorFromDb, dismissSessionErrorCard } = await import("./hydrate-session-error.ts")
    useChatStore.setState({ sessionId: "ses_r" } as never)
    assert.equal(await restoreSessionErrorFromDb("ses_r", { running: false, messages: [] }), true)
    dismissSessionErrorCard()
    await new Promise((r) => setTimeout(r, 0))
    assert.deepEqual(calls, [{ sessionId: "ses_r", runId: "run_9" }])
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})

test("leo #151：lastError 回来时已切到别的会话，不把 A 的红卡写到 B", async () => {
  let release: (v: unknown) => void = () => undefined
  ;(globalThis as { window?: unknown }).window = {
    ide: { session: { lastError: () => new Promise((r) => (release = r)) } }
  }
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { restoreSessionErrorFromDb } = await import("./hydrate-session-error.ts")
    useChatStore.setState({ sessionId: "ses_a" } as never)
    useChatStore.getState().setError(null)
    const pending = restoreSessionErrorFromDb("ses_a", { running: false, messages: [] })
    useChatStore.setState({ sessionId: "ses_b" } as never)
    release({ runId: "r", message: "A 的错" })
    assert.equal(await pending, false)
    assert.equal(useChatStore.getState().error, null)
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})

test("leo #151：重启还原 run_1 红卡、不关就重试、run_2 失败后关卡 → 带 run_2 不带 run_1", async () => {
  const calls: unknown[] = []
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        lastError: () => Promise.resolve({ runId: "run_1", message: "boom1" }),
        dismissError: (input: unknown) => (calls.push(input), Promise.resolve(true))
      }
    }
  }
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
    const { attentionSlotId } = await import("../stores/attention/ingest-attention.ts")
    const { restoreSessionErrorFromDb, dismissSessionErrorCard, restoredErrorRunId } = await import("./hydrate-session-error.ts")
    useChatStore.setState({ sessionId: "ses_s" } as never)
    useChatStore.getState().setError(null)
    assert.equal(await restoreSessionErrorFromDb("ses_s", { running: false, messages: [] }), true)
    assert.equal(restoredErrorRunId(), "run_1")
    // 重试：新一轮开跑清卡，run_2 失败写新卡；Attention 槽记 run_2。
    useChatStore.getState().setError(null)
    assert.equal(restoredErrorRunId(), null)
    useChatStore.getState().setError("boom1")
    useAttentionStore.setState({
      items: [
        { id: attentionSlotId("ses_s", "error"), sessionId: "ses_s", kind: "error", status: "active", runId: "run_2", occurredAt: 2 }
      ]
    } as never)
    dismissSessionErrorCard()
    await new Promise((r) => setTimeout(r, 0))
    assert.deepEqual(calls, [{ sessionId: "ses_s", runId: "run_2" }])
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})

test("leo #151：切会话 restoredCard 作废；关卡只带本会话的 runId", async () => {
  const calls: unknown[] = []
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        lastError: () => Promise.resolve({ runId: "run_a", message: "boomA" }),
        dismissError: (input: unknown) => (calls.push(input), Promise.resolve(true))
      }
    }
  }
  try {
    const { useChatStore } = await import("../stores/chat-store.ts")
    const { useAttentionStore } = await import("../stores/attention/attention-store.ts")
    const { restoreSessionErrorFromDb, dismissSessionErrorCard, restoredErrorRunId } = await import("./hydrate-session-error.ts")
    useAttentionStore.setState({ items: [] } as never)
    useChatStore.setState({ sessionId: "ses_A" } as never)
    useChatStore.getState().setError(null)
    assert.equal(await restoreSessionErrorFromDb("ses_A", { running: false, messages: [] }), true)
    assert.equal(restoredErrorRunId(), "run_a")
    // 切到 B（红卡文案没变也一样作废）。
    useChatStore.setState({ sessionId: "ses_B" } as never)
    assert.equal(restoredErrorRunId(), null)
    dismissSessionErrorCard()
    await new Promise((r) => setTimeout(r, 0))
    assert.deepEqual(calls, [{ sessionId: "ses_B" }])
  } finally {
    delete (globalThis as { window?: unknown }).window
  }
})
