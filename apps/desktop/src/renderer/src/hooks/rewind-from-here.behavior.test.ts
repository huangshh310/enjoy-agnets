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
/** 非 dryRun 的 truncateFrom 回什么（测 zod 校验）。 */
let truncateResult: unknown = { ok: true, deleted: 2 }
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
        if (input.dryRun) return Promise.resolve({ ok: true, deleted: 0 })
        onTruncate?.()
        return Promise.resolve(truncateResult)
      }
      if (path === ".session.messages") return Promise.resolve([])
      return Promise.resolve(path.endsWith(".list") ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const { rewindFromUserTurn, REWIND_FINISH_FAILED, setRewindWritebackWaitForTest } = await import("./rewind-from-here.ts")
const { setComposerComposing } = await import("./composer-ime.ts")
const { setComposerWritebackHeld } = await import("./composer-sync-lock.ts")
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

function seedSession(sessionId = "ses_r", text = TEXT, imgs: Array<Record<string, unknown>> = [IMG_A, IMG_A, IMG_B]) {
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
      { id: "u2", role: "user", content: text, createdAt: 3, assets: imgs },
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
  truncateResult = { ok: true, deleted: 2 }
  setComposerComposing(false)
  setComposerWritebackHeld(false)
  setRewindWritebackWaitForTest(null)
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
  assert.deepEqual(result, { ok: true, draftSessionId: "ses_r" }, "弹窗据此提示原话在原来那个对话的草稿里")
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

const ids = () => useChatStore.getState().messages.map((m) => m.id)
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

test("#167 P2：截断期间切了会话，原会话草稿「look at the book」，写回的「ok」不被当子串吞掉（按行合并）", async () => {
  seedSession("ses_r", "ok", [IMG_A])
  storage.writePersistedDraft("ses_r", "look at the book")
  onTruncate = () => {
    useChatStore.setState({ sessionId: "ses_other", messages: [], composer: "" } as never)
    fakeComposerDom("")
  }
  fakeComposerDom("")
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true, draftSessionId: "ses_r" })
  assert.equal(storage.readPersistedDraft("ses_r"), "look at the book\nok", "原话没丢、一个换行")
  assert.deepEqual((storage.readPersistedDraftAssets("ses_r") ?? []).map((a) => a.id), ["ast_a"])
})

test("#167 P2：原会话有内存草稿（切走时存的）时同样按行合并，内存草稿和落盘一致；整行相同才去重", async () => {
  seedSession("ses_r", "ok\nlook at the book")
  useChatStore.getState().saveSessionDraft("ses_r", { text: "look at the book", assets: [{ id: "ast_a", name: "a.png" }] })
  onTruncate = () => {
    useChatStore.setState({ sessionId: "ses_other", messages: [], composer: "" } as never)
  }
  fakeComposerDom("")
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.equal(result.ok, true)
  const memory = useChatStore.getState().getSessionDraft("ses_r")
  assert.equal(memory?.text, "ok\nlook at the book", "写回的整段包含已有的那行 → 用写回的，不叠两遍")
  assert.equal(storage.readPersistedDraft("ses_r"), "ok\nlook at the book")
  assert.deepEqual((memory?.assets ?? []).map((a: { id: string }) => a.id), ["ast_a", "ast_b"], "图按 id 去重")
})

test("#167 P3：同会话、截断回来时正在用输入法组字 → 等组字结束再合并；合并前消息不删，合并后才删；图进托盘；之后打字不会冲掉", async () => {
  setRewindWritebackWaitForTest({ pollMs: 5, capMs: 5_000 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => {
    // 30 秒超时后用户关了弹窗、开始用中文输入法打字，晚到的成功这时才回来。
    el.value = "我在"
    setComposerComposing(true)
  }
  const pending = rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  await tick(30)
  assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"], "还没合并：消息不删")
  assert.equal(el.value, "我在", "组字中不碰输入框")
  el.value = "我在打字"
  setComposerComposing(false)
  const result = await pending
  assert.deepEqual(result, { ok: true })
  assert.equal(el.value, `我在打字\n${TEXT}`, "用户的字在前，原话一个换行接上")
  assert.equal(useChatStore.getState().composer, `我在打字\n${TEXT}`)
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"], "图进托盘")
  assert.deepEqual(ids(), ["u1", "a1"], "合并成功后才删消息")
  // 用户继续打字：原话在输入框里，跟着输入框落草稿，不会被冲掉。
  useChatStore.getState().setComposer(`我在打字\n${TEXT}继续`)
  assert.ok(String(storage.readPersistedDraft("ses_r")).includes(TEXT))
})

test("#167 P4：同会话、发送占着回写锁（writeback-held）→ 放锁后合并；之前消息不删", async () => {
  setRewindWritebackWaitForTest({ pollMs: 5, capMs: 5_000 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => setComposerWritebackHeld(true)
  const pending = rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  await tick(30)
  assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"])
  assert.equal(el.value, "")
  // 等待期间来了一条新消息（发送流程），它不在截断的尾巴里，不能被一起删掉。
  useChatStore.setState({ messages: [...useChatStore.getState().messages, { id: "u3", role: "user", content: "x", createdAt: 5 }] } as never)
  el.value = "x"
  setComposerWritebackHeld(false)
  const result = await pending
  assert.deepEqual(result, { ok: true })
  assert.equal(el.value, `x\n${TEXT}`)
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"])
  assert.deepEqual(ids(), ["u1", "a1", "u3"], "只删截断的尾巴，新来的留着")
})

test("#167 P3：等的时候切走了 → 进原会话草稿（按行合并），当前会话不动", async () => {
  setRewindWritebackWaitForTest({ pollMs: 5, capMs: 5_000 })
  seedSession()
  storage.writePersistedDraft("ses_r", "我在")
  const el = fakeComposerDom("我在")
  onTruncate = () => setComposerComposing(true)
  const pending = rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  await tick(20)
  setComposerComposing(false)
  useChatStore.setState({ sessionId: "ses_other", messages: [], composer: "" } as never)
  el.value = ""
  const result = await pending
  assert.deepEqual(result, { ok: true, draftSessionId: "ses_r" })
  assert.equal(el.value, "")
  assert.deepEqual(trayIds(), [])
  assert.equal(storage.readPersistedDraft("ses_r"), `我在\n${TEXT}`)
})

test("#167 P3/P4：一直写不进（到点）→ 消息留着看得见、原话进草稿；返回 REWIND_FINISH_FAILED + keepThread（不重读会话）", async () => {
  setRewindWritebackWaitForTest({ pollMs: 5, capMs: 30 })
  seedSession()
  const el = fakeComposerDom("我在")
  quiet()
  onTruncate = () => {
    setComposerComposing(true)
    ideCalls.length = 0
  }
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: false, code: REWIND_FINISH_FAILED, keepThread: true })
  assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"], "消息留着：原话在对话里看得见")
  assert.equal(el.value, "我在", "组字中的输入框没被碰")
  assert.ok(String(storage.readPersistedDraft("ses_r")).includes(TEXT), "原话也进了草稿")
  assert.ok(!ideCalls.includes(".session.messages"), "不重读会话（否则看得见的那条也被收掉）")
})

test("#167 ③：截断后收尾抛错（REWIND_FINISH_FAILED）→ 同会话从库里重读，界面不再挂着已删的消息", async () => {
  seedSession()
  fakeComposerDom("", { throwOnWrite: true })
  quiet()
  onTruncate = () => void (ideCalls.length = 0)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: false, code: REWIND_FINISH_FAILED })
  await tick(20)
  assert.ok(ideCalls.includes(".session.messages"), "重读了会话")
  assert.deepEqual(ids(), ["u1", "a1"], "界面不再挂着截掉的消息")
  assert.equal(storage.readPersistedDraft("ses_r"), TEXT, "原话在草稿里")
})

test("#167：还原的图带着 size（有就留）", async () => {
  seedSession("ses_r", TEXT, [{ ...IMG_A, size: 1234 }, IMG_B])
  fakeComposerDom("")
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true })
  const tray = assets.listComposerAssets()
  assert.equal(tray.find((a) => a.id === "ast_a")?.size, 1234)
  assert.equal(tray.find((a) => a.id === "ast_b")?.size, undefined)
})

test("#167：truncateFrom 回来的东西按 zod 合约校验——不合约按失败，消息不删、不写回", async () => {
  for (const bad of [{ ok: true }, { ok: false, code: "SOMETHING_ELSE" }, null, "ok"]) {
    seedSession()
    const el = fakeComposerDom("")
    quiet()
    truncateResult = bad
    const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
    assert.deepEqual(result, { ok: false, code: "REWIND_TRUNCATE_RESULT_INVALID" }, JSON.stringify(bad))
    assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"])
    assert.equal(el.value, "")
  }
  seedSession()
  fakeComposerDom("")
  truncateResult = { ok: false, code: "TRUNCATE_ROLLBACK_UNSUPPORTED" }
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), {
    ok: false,
    code: "TRUNCATE_ROLLBACK_UNSUPPORTED"
  })
})

test("#167 X7：经 writeBackToComposer 合并（不是只测 helper）——子串不算重复：输入框「category」写回「cat」两行都在", () => {
  useChatStore.setState({ sessionId: "ses_w", composer: "category" } as never)
  const el = fakeComposerDom("category")
  const r = writeback.writeBackToComposer({ text: "cat" }, { mode: "merge", focus: false })
  assert.deepEqual(r, { ok: true, merged: true, text: "category\ncat" })
  assert.equal(el.value, "category\ncat")
  const el2 = fakeComposerDom("look at the book")
  writeback.writeBackToComposer({ text: "ok" }, { mode: "merge", focus: false })
  assert.equal(el2.value, "look at the book\nok")
})

test("#167 P1a / P7：写回的稿里本来就有重复行（含 CRLF）原样保留，不按集合去重", () => {
  useChatStore.setState({ sessionId: "ses_w", composer: "x" } as never)
  const el = fakeComposerDom("x")
  writeback.writeBackToComposer({ text: "a\na\nb" }, { mode: "merge", focus: false })
  assert.equal(el.value, "x\na\na\nb")
  assert.equal(writeback.mergeWritebackText("a\na\nb", "x"), "x\na\na\nb")
  const el2 = fakeComposerDom("draft")
  writeback.writeBackToComposer({ text: "step\r\nstep\r\n\r\n继续" }, { mode: "merge", focus: false })
  assert.equal(el2.value, "draft\nstep\r\nstep\r\n\r\n继续")
  assert.equal(writeback.mergeWritebackText("x\r\ny", "x\ny"), "x\ny", "CRLF 与 LF 同一段：不追加")
})
