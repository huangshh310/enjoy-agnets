/**
 * host F1（#167）：截断成功后、原话到 main 之前被强杀（kill -9），重启时 main 的 pruneEmptySessions
 * 看不到 renderer 的「待放回」记录（localStorage），会把「空」会话连同原话删掉。
 * 修法：截断一成功就把原话按行并进这个会话的草稿并立刻送到 main（persistPendingRewindNow → flushPersistedDrafts），不等防抖。
 *
 * 本文件把 renderer 的草稿桥（window.ide.session.drafts）直接接到 main 的真实草稿表（session-drafts.ts），
 * 截断（truncateFrom）真的删库里的消息；「强杀」= 丢掉 renderer 防抖中的写（不 flush），「重启」= 在库上跑真实的 pruneEmptySessions。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}

const { getDatabase } = await import("../../../main/services/database.ts")
const { persistMessage } = await import("../../../main/services/persist-session.ts")
const { pruneEmptySessions } = await import("../../../main/services/session-lifecycle.ts")
const mainDrafts = await import("../../../main/services/session-drafts.ts")

/** main 这边草稿表的写（防抖结束 / flush 时才到）。 */
const drafts = {
  loadSync: () => mainDrafts.loadSessionDrafts(),
  save: (x: { sessionId: string; text: string }) => mainDrafts.saveSessionDraft(x.sessionId, x.text),
  loadAssetsSync: () => mainDrafts.loadSessionDraftAssets(),
  saveAssets: (x: { sessionId: string; assets: Array<{ id: string; name: string; mediaType?: string; size?: number }> }) =>
    mainDrafts.saveSessionDraftAssets(x.sessionId, x.assets)
}
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : path === ".session" && key === "drafts" ? drafts : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".session.truncateFrom") {
        const input = args[0] as { sessionId: string; dryRun?: boolean }
        if (!input.dryRun) {
          // 首条就被重来：库里这个会话的消息 / run 全截掉，只剩一个「空」会话行。
          getDatabase().prepare("DELETE FROM messages WHERE session_id = ?").run(input.sessionId)
          getDatabase().prepare("DELETE FROM runs WHERE session_id = ?").run(input.sessionId)
        }
        return Promise.resolve({ ok: true, deleted: input.dryRun ? 0 : 1 })
      }
      if (path === ".session.messages") return Promise.resolve([])
      return Promise.resolve(path.endsWith(".list") ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const { rewindFromUserTurn } = await import("./rewind-from-here.ts")
const pendingMod = await import("./rewind-pending.ts")
const storage = await import("../lib/session-draft-storage.ts")
const assets = await import("./composer-assets.ts")
const off = storage.installSessionDraftPersistence()

const TEXT = "please write a note"
const IMG = { assetId: "ast_k", name: "k.png", mediaType: "image/png" }

function newChatWithFirstMessage(sid: string): void {
  const db = getDatabase()
  db.prepare("INSERT OR IGNORE INTO workspaces (id, name, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("ws_kr", "ws", "/tmp", 1, 1)
  db.prepare("INSERT OR IGNORE INTO sessions (id, workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(sid, "ws_kr", "新对话", 1, 1)
  persistMessage(sid, "user", TEXT, [])
  useChatStore.setState({
    workspaceId: "ws_kr",
    sessionId: sid,
    sessionTitle: "新对话",
    running: false,
    runtimeId: "enjoy-local",
    composer: "",
    messages: [
      { id: "u1", role: "user", content: TEXT, createdAt: 1, assets: [IMG] },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 }
    ]
  } as never)
}

/** 假输入框；throwOnWrite = 写 DOM 抛错（store 已写、写回没走完，前台落盘只剩防抖那一条）。 */
function fakeComposerDom(text: string, opts: { throwOnWrite?: boolean } = {}): void {
  let value = text
  const el = {
    get value() {
      return value
    },
    set value(next: string) {
      if (opts.throwOnWrite) throw new Error("dom write exploded")
      value = next
    },
    getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null)
  }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
}

/** 强杀：renderer 进程没了——防抖中的写、轮询、内存记录都丢掉，**不** flush。重启：main 先跑空会话清理。 */
function killAndRestart(): void {
  pendingMod.resetPendingRewindsForTest({ pollMs: 100_000 })
  storage.resetPersistedDraftCacheForTest()
  pruneEmptySessions()
}

const sessionExists = (sid: string) => Boolean(getDatabase().prepare("SELECT 1 FROM sessions WHERE id = ?").get(sid))
const occurrences = (hay: string, needle: string) => hay.split(needle).length - 1

const warn = console.warn
afterEach(() => {
  console.warn = warn
  assets.clearComposerAssets()
  storage.resetPersistedDraftAssetsForTest()
  storage.resetPersistedDraftCacheForTest()
  pendingMod.resetPendingRewindsForTest(null)
  memory.clear()
  delete (globalThis as any).document
})
test.after(() => off())

test("host F1：新对话首条被重来、写回没走完就被强杀 → 重启清空会话时会话还在，main 草稿里原话恰好一次、图也在", async () => {
  newChatWithFirstMessage("ses_kill")
  fakeComposerDom("", { throwOnWrite: true })
  console.warn = () => undefined
  const result = await rewindFromUserTurn({ userMessageId: "u1", restoreFiles: false })
  assert.equal(result.ok, false, "写回本身抛错（REWIND_FINISH_FAILED），原话只在记录 + 草稿里")
  // 不等防抖（300ms），立刻强杀重启。
  killAndRestart()
  assert.equal(sessionExists("ses_kill"), true, "main 看到草稿，没把会话当空壳删掉")
  const text = mainDrafts.loadSessionDrafts()["ses_kill"] ?? ""
  assert.equal(occurrences(text, TEXT), 1, `原话恰好一次：${JSON.stringify(text)}`)
  assert.equal(text.trim(), TEXT)
  const imgs = (mainDrafts.loadSessionDraftAssets()["ses_kill"] ?? []).map((a) => a.id)
  assert.deepEqual(imgs, ["ast_k"], "图按 id 去重后也在 main")
})

test("host F1：输入框已有字、写回成功后立刻强杀 → 会话还在，main 草稿 = 已有字 + 原话（一个换行、不重复）", async () => {
  newChatWithFirstMessage("ses_kill2")
  fakeComposerDom("我刚打的")
  useChatStore.setState({ composer: "我刚打的" } as never)
  const result = await rewindFromUserTurn({ userMessageId: "u1", restoreFiles: false })
  assert.deepEqual(result, { ok: true })
  killAndRestart()
  assert.equal(sessionExists("ses_kill2"), true)
  assert.equal(mainDrafts.loadSessionDrafts()["ses_kill2"], `我刚打的\n${TEXT}`)
  assert.deepEqual((mainDrafts.loadSessionDraftAssets()["ses_kill2"] ?? []).map((a) => a.id), ["ast_k"])
})

test("host F1：正在组字（写回要等）时立刻强杀 → 会话还在，main 草稿里原话恰好一次", async () => {
  const { setComposerComposing } = await import("./composer-ime.ts")
  newChatWithFirstMessage("ses_kill3")
  fakeComposerDom("")
  setComposerComposing(true)
  try {
    const result = await rewindFromUserTurn({ userMessageId: "u1", restoreFiles: false })
    assert.deepEqual(result, { ok: true, writebackPending: true })
  } finally {
    setComposerComposing(false)
  }
  killAndRestart()
  assert.equal(sessionExists("ses_kill3"), true)
  const text = mainDrafts.loadSessionDrafts()["ses_kill3"] ?? ""
  assert.equal(occurrences(text, TEXT), 1)
  assert.deepEqual((mainDrafts.loadSessionDraftAssets()["ses_kill3"] ?? []).map((a) => a.id), ["ast_k"])
})
