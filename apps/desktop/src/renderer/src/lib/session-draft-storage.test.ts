/**
 * jojo / luna：未发草稿按会话落盘、重启还在、发出才清；切会话不把旧稿抄进新会话。
 */
import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}

const { useChatStore } = await import("../stores/chat-store.ts")
const { composerDraftForSession, installSessionDraftPersistence, readPersistedDraft } = await import(
  "./session-draft-storage.ts"
)
const { shouldResetShownOnSessionChange } = await import("../hooks/composer-ime.ts")

installSessionDraftPersistence()

beforeEach(() => {
  memory.clear()
  useChatStore.setState({ sessionId: "ses_a", composer: "", sessionDrafts: {} } as never)
})

test("同一会话里打字落盘；输入框清空（发出成功）才清", () => {
  useChatStore.getState().setComposer("没发的草稿")
  assert.equal(readPersistedDraft("ses_a"), "没发的草稿")
  useChatStore.getState().setComposer("")
  assert.equal(readPersistedDraft("ses_a"), undefined)
})

test("切会话那一刻不写：旧会话的字不会抄进新会话", () => {
  useChatStore.getState().setComposer("A 会话的稿")
  useChatStore.setState({ sessionId: "ses_b", composer: "A 会话的稿" } as never)
  assert.equal(readPersistedDraft("ses_b"), undefined)
  assert.equal(readPersistedDraft("ses_a"), "A 会话的稿")
  // 新对话创建窗（sessionId 为空）也不写。
  useChatStore.setState({ sessionId: null } as never)
  useChatStore.getState().setComposer("新对话里打的")
  assert.equal(readPersistedDraft(""), undefined)
})

test("反向：切会话那一刻输入框换了字，也不写进任何会话（只认同一会话内的改动）", () => {
  useChatStore.getState().setComposer("A 会话的稿")
  useChatStore.setState({ sessionId: "ses_b", composer: "切过去残留的字" } as never)
  assert.equal(readPersistedDraft("ses_b"), undefined)
  assert.equal(readPersistedDraft("ses_a"), "A 会话的稿")
})

test("重启后（内存草稿没了）打开会话：用落盘的正文；别的会话为空", () => {
  useChatStore.getState().setComposer("重启前没发的")
  useChatStore.setState({ sessionId: "ses_b", composer: "", sessionDrafts: {} } as never)
  assert.equal(composerDraftForSession("ses_a")?.text, "重启前没发的")
  assert.equal(composerDraftForSession("ses_b"), undefined)
  // 内存草稿（带附件）优先。
  useChatStore.getState().saveSessionDraft("ses_a", { text: "内存里的", assets: [] })
  assert.equal(composerDraftForSession("ses_a")?.text, "内存里的")
})

test("切会话：输入框里不是新会话的稿就换掉", () => {
  assert.equal(shouldResetShownOnSessionChange("旧会话的字", ""), true)
  assert.equal(shouldResetShownOnSessionChange("同一份", "同一份"), false)
})

test("接线：打开会话走 composerDraftForSession", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("../hooks/session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(src, /const draft = composerDraftForSession\(sessionId\)/)
})
