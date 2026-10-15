/**
 * jojo（#155 245dd0fc 实测，DB 里复现）：
 * (a) 上一个会话的草稿图留在新对话输入框里，被「第一条」带走入库；
 * (b) 「正在准备…」期间贴的图，会话建好那一刻被清掉、哪条消息里都没有。
 * 走 createAndOpenSession 真正调用的两步（开创建窗 / 会话建好）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}

const { detachComposerForCreate, publishCreatedComposer } = await import("./create-window-composer.ts")
const { listComposerAssets, setComposerAssets, queueComposerAsset } = await import("./composer-assets.ts")
const { listQuotedContexts, setQuotedContexts } = await import("./quoted-context.ts")
const { readPersistedDraftAssets, resetPersistedDraftAssetsForTest } = await import("../lib/session-draft-storage.ts")

test("(a) 开创建窗：上一个会话的图 / 引用不留在新对话输入框", () => {
  setComposerAssets([{ id: "ast_old", name: "old.png", mediaType: "image/png" }] as never)
  setQuotedContexts([{ id: "q1", text: "旧引用" }] as never)
  detachComposerForCreate()
  assert.deepEqual(listComposerAssets(), [])
  assert.deepEqual(listQuotedContexts(), [])
})

test("(b) 会话建好：准备中贴的图还在输入框，并落到新会话的草稿", () => {
  resetPersistedDraftAssetsForTest()
  detachComposerForCreate()
  queueComposerAsset({ id: "ast_mid", name: "mid.png", mediaType: "image/png" } as never)
  publishCreatedComposer("ses_new")
  assert.deepEqual(listComposerAssets().map((a) => a.id), ["ast_mid"])
  assert.deepEqual(readPersistedDraftAssets("ses_new")?.map((a) => a.id), ["ast_mid"])
})

test("leo #157：新建会话沿真实路径 开创建窗 → 会话建好 → setSession 之后不处于加载中（不白屏 8 秒）", async () => {
  const { useChatStore } = await import("../stores/chat-store.ts")
  const pending = await import("./session-history-pending.ts")
  // 从一个已打开的会话点「新对话」。
  useChatStore.getState().setSession("ses_prev_open", "上一个会话")
  detachComposerForCreate()
  assert.equal(useChatStore.getState().sessionId, null)
  // session-lifecycle.publishCreatedSession 的顺序：先 publishCreatedComposer，再 setSession。
  publishCreatedComposer("ses_created_fresh")
  useChatStore.getState().setSession("ses_created_fresh", "新对话")
  useChatStore.getState().setMessages([])
  const state = useChatStore.getState()
  assert.equal(state.sessionId, "ses_created_fresh")
  assert.equal(
    pending.sessionHistoryPending({
      sessionId: state.sessionId,
      messageCount: state.messages.length,
      running: state.running,
      hydrated: pending.isSessionHistoryHydrated("ses_created_fresh"),
      timedOut: false
    }),
    false,
    "新建会话发布后停在加载中：每次「新对话」都会白屏到 8 秒兜底"
  )
})
