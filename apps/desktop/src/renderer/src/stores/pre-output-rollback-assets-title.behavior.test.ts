/**
 * jojo P1 / P2（#136 gate2）：出字前回滚走 store.applyStreamEvent 真实路径。
 * - P1：本轮用户句带的图跟字一起回输入框，并按本会话落草稿附件（不只是字）。
 * - P2：新会话第一句被回滚：自动标题回到发之前的占位，并作废还在跑的标题精炼。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

const { useChatStore } = await import("./chat-store.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("./discarded-pre-output-runs.ts")
const { listComposerAssets, setComposerAssets, setComposerAssetPersister } = await import("../hooks/composer-assets.ts")
const { applyOptimisticTitle, resetSessionTitleRollbackForTest } = await import("../hooks/session-title.ts")

const persisted: Array<{ sessionId: string | null; ids: string[] }> = []

beforeEach(() => {
  resetDiscardedPreOutputRunsForTest()
  resetSessionTitleRollbackForTest()
  setComposerAssets([])
  persisted.length = 0
  setComposerAssetPersister((items) =>
    persisted.push({ sessionId: useChatStore.getState().sessionId, ids: items.map((item) => item.id) })
  )
})

const preOutputError = (runId: string) =>
  ({ type: "run.error", runId, message: "provider_unreachable", code: "provider_unreachable", preOutput: true }) as never

function seedFirstTurn(sessionId: string, runId: string) {
  useChatStore.setState({
    sessionId,
    sessionTitle: "新对话",
    repositories: [],
    running: true,
    runId,
    composer: "",
    error: null,
    pendingStreamEvents: [],
    messages: []
  } as never)
  applyOptimisticTitle("帮我看看这张图里的报错")
  useChatStore.setState({
    messages: [
      {
        id: "u1",
        role: "user",
        content: "帮我看看这张图里的报错",
        createdAt: 1,
        assets: [
          { assetId: "ast_a", mediaType: "image/png", name: "a.png", url: "blob:revoked-a" },
          { assetId: "ast_b", mediaType: "image/jpeg", name: "b.jpg" }
        ]
      },
      { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
}

test("P1：出字前回滚后，图和字一起回输入框，并落本会话草稿附件", () => {
  seedFirstTurn("ses_img", "run_img")
  useChatStore.getState().applyStreamEvent(preOutputError("run_img"))
  const state = useChatStore.getState()
  assert.deepEqual(state.messages, [])
  assert.equal(state.composer, "帮我看看这张图里的报错")
  const assets = listComposerAssets()
  assert.deepEqual(assets.map((a) => a.id), ["ast_a", "ast_b"])
  assert.equal(assets[0]?.url, undefined, "已释放的 blob: 预览去掉，缩略图按 id 重读")
  assert.equal(assets[1]?.mediaType, "image/jpeg")
  assert.deepEqual(persisted.at(-1), { sessionId: "ses_img", ids: ["ast_a", "ast_b"] })
})

test("P1：输入框里已有别的附件时并进去，按 id 去重", () => {
  seedFirstTurn("ses_merge", "run_merge")
  setComposerAssets([{ id: "ast_new", name: "new.png" }, { id: "ast_b", name: "b.jpg" }])
  useChatStore.getState().applyStreamEvent(preOutputError("run_merge"))
  assert.deepEqual(listComposerAssets().map((a) => a.id), ["ast_new", "ast_b", "ast_a"])
})

test("P2：新会话第一句被回滚：标题回到发之前的占位（侧栏和标题栏）", () => {
  seedFirstTurn("ses_title", "run_title")
  useChatStore.setState({ repositories: [{ id: "ses_title", name: "帮我看看这张图里的报错" }] } as never)
  assert.notEqual(useChatStore.getState().sessionTitle, "新对话", "乐观标题已上屏")
  useChatStore.getState().applyStreamEvent(preOutputError("run_title"))
  assert.equal(useChatStore.getState().sessionTitle, "新对话")
})

test("P2：线程里还有更早的用户句：标题不是这一句起的，不动", () => {
  seedFirstTurn("ses_keep", "run_keep")
  useChatStore.setState({
    sessionTitle: "早先的标题",
    messages: [
      { id: "u0", role: "user", content: "早先", createdAt: 0 },
      { id: "a0", role: "assistant", content: "早先的回复", createdAt: 0 },
      ...useChatStore.getState().messages
    ]
  } as never)
  useChatStore.getState().applyStreamEvent(preOutputError("run_keep"))
  assert.equal(useChatStore.getState().sessionTitle, "早先的标题")
})

test("P2：标题精炼还在跑时第一句被回滚：精炼回来也不改名（库和界面都留在占位）", async () => {
  const { completeSessionTitle } = await import("../hooks/session-title.ts")
  const listeners = new Set<(event: unknown) => void>()
  const renames: Array<{ sessionId: string; title: string }> = []
  const g = globalThis as { window?: unknown }
  const hadWindow = "window" in g
  const prevWindow = g.window
  g.window = {
    ide: {
      settings: { get: async () => ({ defaultModelId: "m_title" }) },
      ai: { generate: async () => ({ runId: "run_refine" }) },
      agent: {
        onEvent: (cb: (event: unknown) => void) => {
          listeners.add(cb)
          return () => listeners.delete(cb)
        }
      },
      session: {
        rename: async (input: { sessionId: string; title: string }) => {
          renames.push(input)
          return { title: input.title }
        }
      }
    }
  }
  try {
    seedFirstTurn("ses_refine", "run_turn")
    useChatStore.setState({ modelId: null, preferredModelId: "m_title", runtimeId: null } as never)
    const refining = completeSessionTitle("帮我看看这张图里的报错")
    for (let i = 0; i < 20 && listeners.size === 0; i++) await new Promise((r) => setTimeout(r, 5))
    assert.equal(listeners.size, 1, "精炼已开跑")
    useChatStore.getState().applyStreamEvent(preOutputError("run_turn"))
    await new Promise((r) => setTimeout(r, 5))
    for (const cb of listeners) {
      cb({ type: "text.delta", runId: "run_refine", text: "截图报错排查" })
      cb({ type: "run.end", runId: "run_refine" })
    }
    await refining
    assert.equal(useChatStore.getState().sessionTitle, "新对话")
    assert.equal(renames.at(-1)?.title, "新对话", "库里也改回占位")
    assert.ok(!renames.some((r) => r.title === "截图报错排查"), "精炼结果不得落库")
  } finally {
    if (hadWindow) g.window = prevWindow
    else delete g.window
  }
})

test("P2：发送被挡、撤掉乐观首句（failComposerSend dropOptimisticUser）：标题也复原", async () => {
  const { failComposerSend } = await import("../hooks/runtime-interact/fail-composer-send.ts")
  seedFirstTurn("ses_blocked", "run_blocked")
  useChatStore.setState({ messages: [useChatStore.getState().messages[0]!] } as never)
  failComposerSend({
    text: "帮我看看这张图里的报错",
    reason: "credential_invalid",
    sessionId: "ses_blocked",
    dropOptimisticUser: true
  })
  assert.deepEqual(useChatStore.getState().messages, [])
  assert.equal(useChatStore.getState().sessionTitle, "新对话")
})
