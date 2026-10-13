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
const {
  composerDraftForSession,
  DRAFT_PERSIST_DEBOUNCE_MS,
  flushPersistedDrafts,
  holdEmptyDraftWrite,
  installSessionDraftPersistence,
  readPersistedDraft,
  releaseEmptyDraftHold,
  resetPersistedDraftCacheForTest
} = await import(
  "./session-draft-storage.ts"
)
const { shouldResetShownOnSessionChange } = await import("../hooks/composer-ime.ts")

installSessionDraftPersistence()

beforeEach(() => {
  resetPersistedDraftCacheForTest()
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

test("jojo P1：有 main 桥时草稿防抖后写到 main，不写 localStorage；重启从 main 读回（每个会话各自）", async () => {
  const saved: Record<string, string> = {}
  const calls: Array<{ sessionId: string; text: string }> = []
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        drafts: {
          loadSync: () => ({ ...saved }),
          save: (input: { sessionId: string; text: string }) => {
            calls.push(input)
            if (input.text) saved[input.sessionId] = input.text
            else delete saved[input.sessionId]
          }
        }
      }
    }
  }
  try {
    resetPersistedDraftCacheForTest()
    useChatStore.getState().setComposer("A 的稿")
    useChatStore.getState().setComposer("A 的稿！")
    assert.equal(calls.length, 0, "防抖期内不写")
    await new Promise((r) => setTimeout(r, DRAFT_PERSIST_DEBOUNCE_MS + 50))
    assert.deepEqual(calls, [{ sessionId: "ses_a", text: "A 的稿！" }], "停手后只写最后一版")
    useChatStore.setState({ sessionId: "ses_b", composer: "" } as never)
    useChatStore.getState().setComposer("B 的稿")
    flushPersistedDrafts()
    assert.equal(memory.size, 0, "不再依赖 localStorage")
    // 模拟强杀重启：内存缓存没了，从 main 读。
    resetPersistedDraftCacheForTest()
    assert.equal(readPersistedDraft("ses_a"), "A 的稿！")
    assert.equal(readPersistedDraft("ses_b"), "B 的稿")
  } finally {
    delete (globalThis as { window?: unknown }).window
    resetPersistedDraftCacheForTest()
  }
})

test("leo：发送途中清空输入框不往 main 写 \"\"（落库前强杀不丢稿）；发出后才补清", () => {
  const calls: Array<{ sessionId: string; text: string }> = []
  ;(globalThis as { window?: unknown }).window = {
    ide: { session: { drafts: { loadSync: () => ({}), save: (input: { sessionId: string; text: string }) => void calls.push(input) } } }
  }
  try {
    resetPersistedDraftCacheForTest()
    useChatStore.getState().setComposer("要发的稿")
    flushPersistedDrafts()
    calls.length = 0
    holdEmptyDraftWrite("ses_a")
    useChatStore.getState().setComposer("")
    flushPersistedDrafts()
    assert.deepEqual(calls, [], "消息落库前 main 里的稿不能被清")
    assert.equal(readPersistedDraft("ses_a"), undefined, "缓存照清，界面不残留")
    releaseEmptyDraftHold("ses_a", false)
    flushPersistedDrafts()
    assert.deepEqual(calls, [], "没发出去：不清 main")
    holdEmptyDraftWrite("ses_a")
    releaseEmptyDraftHold("ses_a", true)
    flushPersistedDrafts()
    assert.deepEqual(calls, [{ sessionId: "ses_a", text: "" }], "发出后补清")
  } finally {
    delete (globalThis as { window?: unknown }).window
    resetPersistedDraftCacheForTest()
  }
})

test("接线：send-composer-run 发送时 hold 空稿写、收尾 release", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("../hooks/runtime-interact/send-composer-run.ts", import.meta.url), "utf8")
  assert.match(src, /holdEmptyDraftWrite\(draftSid\)/)
  assert.match(src, /finally \{\s*if \(draftSid\) releaseEmptyDraftHold\(draftSid, draftPersisted\)/)
})

test("leo：交接返回但 main 没确认落库（无 userMessageId）→ 强杀后 main 里的稿还在；确认落库才补清", async () => {
  const { userMessagePersisted } = await import("../hooks/runtime-interact/send-composer-run.ts")
  const saved: Record<string, string> = {}
  ;(globalThis as { window?: unknown }).window = {
    ide: {
      session: {
        drafts: {
          loadSync: () => ({ ...saved }),
          save: (input: { sessionId: string; text: string }) => {
            if (input.text) saved[input.sessionId] = input.text
            else delete saved[input.sessionId]
          }
        }
      }
    }
  }
  try {
    for (const [result, expected] of [
      [{ ok: true, runId: "run_1" }, "要发的稿"],
      [{ ok: true, runId: "run_1", userMessageId: "msg_u" }, undefined]
    ] as const) {
      resetPersistedDraftCacheForTest()
      useChatStore.setState({ sessionId: "ses_a", composer: "" } as never)
      useChatStore.getState().setComposer("要发的稿")
      flushPersistedDrafts()
      holdEmptyDraftWrite("ses_a")
      useChatStore.getState().setComposer("")
      releaseEmptyDraftHold("ses_a", userMessagePersisted(result))
      flushPersistedDrafts()
      // 模拟强杀重启：内存缓存没了，从 main 读。
      resetPersistedDraftCacheForTest()
      assert.equal(readPersistedDraft("ses_a"), expected, JSON.stringify(result))
    }
  } finally {
    delete (globalThis as { window?: unknown }).window
    resetPersistedDraftCacheForTest()
  }
})

test("接线：生图发送把输入框原文交给 main（draftText），落 prompt 同事务清稿", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("../hooks/runtime-interact/send-composer-run.ts", import.meta.url), "utf8")
  assert.match(src, /payload\.computerUseOnce,\s*payload\.typed\s*\)/)
  assert.match(src, /\.\.\.\(draftText\?\.trim\(\) \? \{ draftText \} : \{\}\)/)
})
