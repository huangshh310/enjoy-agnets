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
