/**
 * #159 F1（leo BLOCK）：「从这里重来」截断成功之后的写回路径。真走 rewindFromUserTurn + composer-writeback + 草稿存档，
 * 只假 IPC 桥（window.ide）和输入框 DOM。
 * - 截断后改消息 / 对焦抛错：原话和图仍在输入框（先写回、再改消息），返回通用失败。
 * - 写回本身抛错：原话和图进原会话草稿兜底。
 * - 截断的 await 期间切了会话：写进**原会话**草稿（与已有草稿合并），当前会话的输入框 / 消息 / 托盘一个字不动。
 * - 输入框已有字 / 图：合并（现有在前、一个换行），图按 id 去重；消息里重复的图也只进一次。
 * - composer-writeback merge：一个换行分隔、同一段不写两遍、整行比较不吞子串。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}
let dbAssets: Record<string, Array<Record<string, unknown>>> = {}
const ideCalls: string[] = []
/** 每次 truncateFrom（非 dryRun）被调时跑一下，模拟 await 期间用户的操作。 */
let onTruncate: (() => void) | null = null
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      ideCalls.push(path)
      if (path === ".session.drafts.loadSync") return {}
      if (path === ".session.drafts.loadAssetsSync") return JSON.parse(JSON.stringify(dbAssets))
      if (path === ".session.drafts.saveAssets") {
        const input = args[0] as { sessionId: string; assets: Array<Record<string, unknown>> }
        if (input.assets.length) dbAssets[input.sessionId] = input.assets
        else delete dbAssets[input.sessionId]
        return undefined
      }
      if (path === ".session.truncateFrom") {
        const input = args[0] as { dryRun?: boolean }
        if (!input.dryRun) onTruncate?.()
        return Promise.resolve({ ok: true, deleted: 2 })
      }
      if (path === ".session.messages") return Promise.resolve([])
      return Promise.resolve(path.endsWith(".list") ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const { rewindFromUserTurn, REWIND_FINISH_FAILED } = await import("./rewind-from-here.ts")
const writeback = await import("./composer-writeback.ts")
const assets = await import("./composer-assets.ts")
const storage = await import("../lib/session-draft-storage.ts")
const { registerComposerFocus } = await import("./composer-focus.ts")
const off = storage.installSessionDraftPersistence()

const IMG_A = { assetId: "ast_a", name: "a.png", mediaType: "image/png" }
const IMG_B = { assetId: "ast_b", name: "b.png", mediaType: "image/png" }
const TEXT = "please write a note"

/** 假输入框：value 就是 DOM 里的字。throwOnWrite = 写 DOM 时抛错。 */
function fakeComposerDom(domText: string, opts: { throwOnWrite?: boolean } = {}) {
  let value = domText
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
  return el
}

function seedSession(sessionId = "ses_r") {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    sessionTitle: "rewind",
    running: false,
    runtimeId: "enjoy-local",
    composer: "",
    messages: [
      { id: "u1", role: "user", content: "first", createdAt: 1 },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 },
      // 同一张图在消息里出现两次：写回托盘只进一次。
      { id: "u2", role: "user", content: TEXT, createdAt: 3, assets: [IMG_A, IMG_A, IMG_B] },
      { id: "a2", role: "assistant", content: "stub-ok", createdAt: 4 }
    ]
  } as never)
}

const realSetMessages = useChatStore.getState().setMessages
const warn = console.warn
afterEach(() => {
  useChatStore.setState({ setMessages: realSetMessages, sessionDrafts: {} } as never)
  assets.clearComposerAssets()
  storage.resetPersistedDraftAssetsForTest()
  storage.resetPersistedDraftCacheForTest()
  memory.clear()
  dbAssets = {}
  ideCalls.length = 0
  onTruncate = null
  console.warn = warn
  delete (globalThis as any).document
})
test.after(() => off())

const trayIds = () => assets.listComposerAssets().map((a) => a.id)
const quiet = () => {
  const warns: unknown[][] = []
  console.warn = (...args: unknown[]) => void warns.push(args)
  return warns
}

test("截断后 setMessages 抛错：原话和图已经在输入框（先写回再改消息），图不重复；返回通用失败", async () => {
  seedSession()
  const el = fakeComposerDom("")
  const warns = quiet()
  useChatStore.setState({
    setMessages: () => {
      throw new Error("render exploded")
    }
  } as never)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: false, code: REWIND_FINISH_FAILED })
  assert.ok(ideCalls.includes(".session.truncateFrom"), "截断已经成功")
  assert.equal(el.value, TEXT, "原话在输入框 DOM")
  assert.equal(useChatStore.getState().composer, TEXT, "原话在 store")
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"], "图都在、按 id 去重")
  assert.ok(warns.some((w) => String(w[0]).includes(REWIND_FINISH_FAILED)), "原始错误只进日志")
})

test("截断后对焦抛错：原话和图仍在输入框", async () => {
  seedSession()
  const el = fakeComposerDom("")
  quiet()
  const unregister = registerComposerFocus(() => {
    throw new Error("focus exploded")
  })
  try {
    const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
    assert.equal(result.ok, false)
    assert.equal(el.value, TEXT)
    assert.deepEqual(trayIds(), ["ast_a", "ast_b"])
  } finally {
    unregister()
  }
})

test("写回输入框本身抛错：原话和图进原会话草稿兜底（不丢）", async () => {
  seedSession()
  fakeComposerDom("", { throwOnWrite: true })
  quiet()
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: false, code: REWIND_FINISH_FAILED })
  assert.equal(storage.readPersistedDraft("ses_r"), TEXT, "原会话草稿里有原话")
  assert.deepEqual(
    (storage.readPersistedDraftAssets("ses_r") ?? []).map((a) => a.id),
    ["ast_a", "ast_b"],
    "原会话草稿里有图、不重复"
  )
})

test("截断的 await 期间切了会话（session-changed）：写进原会话草稿并与已有草稿合并；当前会话一个字不动", async () => {
  seedSession()
  storage.writePersistedDraft("ses_r", "我先打的")
  const otherMessages = [{ id: "x1", role: "user", content: "别的会话", createdAt: 9 }]
  let el = fakeComposerDom("")
  onTruncate = () => {
    // 用户在截断那一下切到了别的会话，并在那里打了字。
    useChatStore.setState({ sessionId: "ses_other", messages: otherMessages, composer: "B 的字" } as never)
    el = fakeComposerDom("B 的字")
  }
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true })
  const now = useChatStore.getState()
  assert.equal(now.sessionId, "ses_other")
  assert.equal(el.value, "B 的字", "当前会话输入框没被写")
  assert.equal(now.composer, "B 的字")
  assert.deepEqual(now.messages, otherMessages, "当前会话的消息没被改")
  assert.deepEqual(trayIds(), [], "当前会话托盘没进图")
  assert.equal(storage.readPersistedDraft("ses_r"), `我先打的\n${TEXT}`, "原会话草稿：已有在前、一个换行")
  assert.deepEqual((storage.readPersistedDraftAssets("ses_r") ?? []).map((a) => a.id), ["ast_a", "ast_b"])
})

test("输入框已有字和图：合并不覆盖，图按 id 去重；成功后消息截到这条之前", async () => {
  seedSession()
  const el = fakeComposerDom("我刚打的")
  assets.queueComposerAsset({ id: "ast_a", name: "a.png", mediaType: "image/png" })
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true })
  assert.equal(el.value, `我刚打的\n${TEXT}`)
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"], "已在托盘的 A 不再进一次")
  assert.deepEqual(
    useChatStore.getState().messages.map((m) => m.id),
    ["u1", "a1"]
  )
})

test("composer-writeback merge：一个换行分隔；同一段不追加两遍；整行比较不吞子串", () => {
  const { mergeWritebackText } = writeback
  assert.equal(mergeWritebackText("queued two", "billing first"), "billing first\nqueued two", "不会变成 billing firstqueued two")
  assert.equal(mergeWritebackText("billing first", "billing first"), "billing first", "相同不追加")
  assert.equal(mergeWritebackText("billing first", "  billing first \n"), "  billing first \n", "只差空白也算相同")
  assert.equal(mergeWritebackText("queued two", "billing first\nqueued two"), "billing first\nqueued two", "已在里面不追加")
  assert.equal(mergeWritebackText("a\nb", "a\nb\nc"), "a\nb\nc", "多行块已在里面")
  assert.equal(mergeWritebackText("billing first\nqueued two", "billing first"), "billing first\nqueued two", "写回的包含现有的 → 用写回的")
  assert.equal(mergeWritebackText("cat", "category"), "category\ncat", "子串不算重复")
  assert.equal(mergeWritebackText("two", "one\n\n"), "one\ntwo", "现有末尾的空行收掉，只留一个换行")
  assert.equal(mergeWritebackText("\n\ntwo", "one"), "one\ntwo", "写回的开头空行收掉")
  assert.equal(mergeWritebackText("x", ""), "x")
  assert.equal(mergeWritebackText("", "y"), "y")
})

test("composer-writeback merge 写两遍同一段：输入框里只出现一次，图也只一张", () => {
  useChatStore.setState({ sessionId: "ses_w", composer: "" } as never)
  const el = fakeComposerDom("billing first")
  const img = { id: "ast_w", name: "w.png", mediaType: "image/png" }
  const first = writeback.writeBackToComposer({ text: "queued two", assets: [img, img] }, { mode: "merge", focus: false })
  assert.deepEqual(first, { ok: true, merged: true, text: "billing first\nqueued two" })
  const second = writeback.writeBackToComposer({ text: "queued two", assets: [img] }, { mode: "merge", focus: false })
  assert.deepEqual(second, { ok: true, merged: true, text: "billing first\nqueued two" })
  assert.equal(el.value, "billing first\nqueued two")
  assert.deepEqual(trayIds(), ["ast_w"])
})

test("composer-writeback merge + expectSessionId：换了会话返回 session-changed，什么都不写", () => {
  useChatStore.setState({ sessionId: "ses_now", composer: "" } as never)
  const el = fakeComposerDom("别动")
  const r = writeback.writeBackToComposer({ text: "回来的", assets: [{ id: "ast_x", name: "x.png" }] }, { mode: "merge", expectSessionId: "ses_old", focus: false })
  assert.deepEqual(r, { ok: false, reason: "session-changed", current: "别动" })
  assert.equal(el.value, "别动")
  assert.deepEqual(trayIds(), [])
})
