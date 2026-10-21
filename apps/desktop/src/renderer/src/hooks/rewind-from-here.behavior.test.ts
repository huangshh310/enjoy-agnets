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
import { readFileSync } from "node:fs"
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
/** renderer 往 main 送的草稿（sessionId → 每次 save 的正文）。 */
const draftSaves: Array<{ sessionId: string; text: string }> = []
/** session.listArchived 回什么（测删会话）。 */
let archivedRows: Array<{ id: string; workspaceId: string }> = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      ideCalls.push(path)
      if (path === ".session.drafts.save") draftSaves.push({ ...(args[0] as { sessionId: string; text: string }) })
      if (path === ".session.listArchived") return Promise.resolve(archivedRows.map((row) => ({ ...row })))
      if (path === ".workspace.remove") return Promise.resolve({ id: (args[0] as { workspaceId: string }).workspaceId })
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
const { rewindFromUserTurn, REWIND_FINISH_FAILED } = await import("./rewind-from-here.ts")
const pendingMod = await import("./rewind-pending.ts")
const { setComposerComposing } = await import("./composer-ime.ts")
const { setComposerWritebackHeld } = await import("./composer-sync-lock.ts")
const writeback = await import("./composer-writeback.ts")
const assets = await import("./composer-assets.ts")
const storage = await import("../lib/session-draft-storage.ts")
const { registerComposerFocus } = await import("./composer-focus.ts")
const { emptySessionToDiscardOnLeave } = await import("./discard-empty-on-leave.ts")
// 删会话的真入口（leo r7 S3）。要在任何测试装假 document 之前加载：sonner 加载时往 document 里插 CSS，没有 document 就跳过。
const lifecycle = await import("./workspace-lifecycle.ts")
const { queryClient } = await import("../lib/query-client.ts")
const off = storage.installSessionDraftPersistence()

const IMG_A = { assetId: "ast_a", name: "a.png", mediaType: "image/png" }
const IMG_B = { assetId: "ast_b", name: "b.png", mediaType: "image/png" }
const TEXT = "please write a note"

/** 假输入框：value 就是 DOM 里的字。throwOnWrite = 写 DOM 时抛错。 */
function fakeComposerDom(domText: string, opts: { throwOnWrite?: boolean } = {}) {
  // opts 每次写都现读：测试里可以中途把 throwOnWrite 关掉（模拟输入框恢复）。
  let value = domText
  const el = {
    get value() {
      return value
    },
    set value(next: string) {
      if (opts.throwOnWrite) throw new Error("dom write exploded")
      value = next
    },
    getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null),
    caret: null as null | [number, number],
    setSelectionRange(a: number, b: number) {
      el.caret = [a, b]
    }
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
  draftSaves.length = 0
  archivedRows = []
  onTruncate = null
  truncateResult = { ok: true, deleted: 2 }
  setComposerComposing(false)
  setComposerWritebackHeld(false)
  pendingMod.resetPendingRewindsForTest(null)
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

test("#167 Q9：写回成功之后 setMessages 抛错：原话和图已经在输入框，返回 ok（不说「没能放回输入框」），从库里重读会话", async () => {
  seedSession()
  const el = fakeComposerDom("")
  const warns = quiet()
  useChatStore.setState({
    setMessages: () => {
      throw new Error("render exploded")
    }
  } as never)
  onTruncate = () => void (ideCalls.length = 0)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true })
  assert.equal(el.value, TEXT, "原话在输入框 DOM")
  assert.equal(useChatStore.getState().composer, TEXT, "原话在 store")
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"], "图都在、按 id 去重")
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined, "已落地，记录删了")
  assert.ok(warns.some((w) => String(w[0]).includes("update thread after write-back failed")), "原始错误只进日志")
  await tick(10)
  assert.ok(ideCalls.includes(".session.messages"), "重读了会话")
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
    assert.equal(result.ok, true, "原话已进输入框：对焦失败不算失败")
    assert.equal(el.value, TEXT)
    assert.deepEqual(trayIds(), ["ast_a", "ast_b"])
  } finally {
    unregister()
  }
})

test("#167 r3 catch：写回输入框本身抛错 → 不往当前会话草稿里塞（会被输入框盖掉）；记录留着，输入框恢复后放进去，消息到那时才拿掉", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const domOpts = { throwOnWrite: true }
  const el = fakeComposerDom("", domOpts)
  quiet()
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: false, code: REWIND_FINISH_FAILED })
  assert.equal(pendingMod.readPendingRewind("ses_r")?.text, TEXT, "原话在待放回记录里")
  assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"], "还没落地：消息留着")
  domOpts.throwOnWrite = false
  await tick(1200)
  assert.equal(el.value, TEXT, "输入框恢复后原话放进去了")
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"])
  assert.deepEqual(ids(), ["u1", "a1"], "落地后才拿掉截掉的消息")
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined)
})

test("#167 r3 catch：写回抛错后用户继续打字（草稿被输入框盖成新字），再切走 → 原话按行并进原会话草稿，没丢", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  fakeComposerDom("", { throwOnWrite: true })
  quiet()
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: false, code: REWIND_FINISH_FAILED })
  useChatStore.getState().setComposer("我在打字")
  assert.equal(storage.readPersistedDraft("ses_r"), "我在打字", "当前会话草稿归输入框")
  leaveTo("ses_other")
  await tick(20)
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字\n${TEXT}`)
  assert.equal(useChatStore.getState().getSessionDraft("ses_r")?.text, `我在打字\n${TEXT}`)
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true, "并进草稿后停放，等回到前台再对输入框")
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

test("#167 P3：同会话、截断回来时正在用输入法组字 → 弹窗立刻收（writebackPending），后台等组字结束再合并；合并前消息不删，合并后才删；图进托盘", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => {
    // 30 秒超时后用户关了弹窗、开始用中文输入法打字，晚到的成功这时才回来。
    el.value = "我在"
    setComposerComposing(true)
  }
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true, writebackPending: true }, "不等写回：弹窗不会因此显示失败句")
  await tick(30)
  assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"], "还没合并：消息不删")
  assert.equal(el.value, "我在", "组字中不碰输入框")
  el.value = "我在打字"
  setComposerComposing(false)
  await tick(30)
  assert.equal(el.value, `我在打字\n${TEXT}`, "用户的字在前，原话一个换行接上")
  assert.equal(useChatStore.getState().composer, `我在打字\n${TEXT}`)
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"], "图进托盘")
  assert.deepEqual(ids(), ["u1", "a1"], "合并成功后才删消息")
  useChatStore.getState().setComposer(`我在打字\n${TEXT}继续`)
  assert.ok(String(storage.readPersistedDraft("ses_r")).includes(TEXT))
})

test("#167 P4 / Q5：发送占着回写锁 → 放锁后合并；等待期间新来的消息、以及会话重读后的库行都留着，只拿掉截断时记下的 id", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => setComposerWritebackHeld(true)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true, writebackPending: true })
  await tick(20)
  assert.deepEqual(ids(), ["u1", "a1", "u2", "a2"])
  // 等待期间会话被重读（库里已截掉 u2/a2，又来了 u3/a3）。
  useChatStore.setState({
    messages: [
      { id: "u1", role: "user", content: "first", createdAt: 1 },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 },
      { id: "u3", role: "user", content: "x", createdAt: 5 },
      { id: "a3", role: "assistant", content: "y", createdAt: 6 }
    ]
  } as never)
  el.value = "x"
  setComposerWritebackHeld(false)
  await tick(30)
  assert.equal(el.value, `x\n${TEXT}`)
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"])
  assert.deepEqual(ids(), ["u1", "a1", "u3", "a3"], "Q5：不退回截断时的快照，u3/a3 留着")
})

/** 模拟 loadSession 切走：先把输入框存成离开会话的内存草稿，再换会话。 */
function leaveTo(next: string) {
  const store = useChatStore.getState()
  store.saveSessionDraft(store.sessionId!, { text: store.composer, assets: assets.listComposerAssets() })
  useChatStore.setState({ sessionId: next, messages: [], composer: "" } as never)
  fakeComposerDom("")
}

test("#167 r3 Q3：等写回期间用户一直在组字打字（草稿被输入框盖成「我在打字」），切走 → 原话按行并进原会话草稿", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true, writebackPending: true })
  // 一直组字（每次 compositionend 后马上又开始）：输入框落盘，当前会话草稿就是输入框的字。
  el.value = "我在打字"
  useChatStore.getState().setComposer("我在打字")
  ideCalls.length = 0
  await tick(30)
  assert.equal(pendingMod.readPendingRewind("ses_r")?.text, TEXT, "原话在待放回记录里，没被盖掉")
  // leo r4：等待中把「输入框的字 + 原话」写进当前会话草稿并立刻送到 main（不只靠 localStorage）。
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字\n${TEXT}`)
  assert.ok(ideCalls.includes(".session.drafts.save"), "等待中就送到 main")
  assert.deepEqual((storage.readPersistedDraftAssets("ses_r") ?? []).map((a) => a.id), ["ast_a", "ast_b"])
  // 输入框又变了，订阅把草稿盖回输入框的字 → 下一拍再补上；补多少次都只一份。
  el.value = "我在打字啊"
  useChatStore.getState().setComposer("我在打字啊")
  assert.equal(storage.readPersistedDraft("ses_r"), "我在打字啊")
  await tick(30)
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字啊\n${TEXT}`)
  await tick(30)
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字啊\n${TEXT}`, "幂等：不重复")
  el.value = "我在打字"
  useChatStore.getState().setComposer("我在打字")
  setComposerComposing(false)
  leaveTo("ses_other")
  await tick(20)
  assert.equal(useChatStore.getState().getSessionDraft("ses_r")?.text, `我在打字\n${TEXT}`)
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字\n${TEXT}`)
  assert.deepEqual((storage.readPersistedDraftAssets("ses_r") ?? []).map((a) => a.id), ["ast_a", "ast_b"])
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true, "并进草稿后停放（实机 11 / 14：回到前台时还要对一遍输入框）")
  assert.equal(useChatStore.getState().composer, "", "新前台的输入框没被写")
  assert.deepEqual(trayIds(), [])
})

test("#167 r3 Q4：截断一成功就有持久副本（自己的 localStorage 键）；模拟重启后读回，会话不在前台时直接并进它的草稿", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true, writebackPending: true })
  const raw = JSON.parse(String(memory.get("enjoy-agents-pending-rewinds")))
  assert.equal(raw.ses_r.text, TEXT, "等待期间就有持久副本")
  assert.deepEqual(raw.ses_r.assets.map((a: { id: string }) => a.id), ["ast_a", "ast_b"])
  // 重启：进程内状态全没了，只剩 localStorage；启动时前台还没打开 ses_r。
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  pendingMod.forgetPendingRewindCacheForTest()
  setComposerComposing(false)
  storage.writePersistedDraft("ses_r", "我在打字")
  useChatStore.setState({ sessionId: null, messages: [], composer: "" } as never)
  pendingMod.ensurePendingRewindLoop()
  await tick(30)
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字\n${TEXT}`)
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true)
  assert.equal(JSON.parse(String(memory.get("enjoy-agents-pending-rewinds"))).ses_r.parked, true, "停放状态也落盘")
})

test("#167 r3：关窗 / 刷新（pagehide）时还在等 → 以输入框当下的字为底按行并进草稿，立刻送到 main", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  const result = await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  assert.deepEqual(result, { ok: true, writebackPending: true })
  el.value = "我在打字"
  useChatStore.getState().setComposer("我在打字")
  // 内存草稿是很久以前切走时存的旧稿：不能拿它当底。
  useChatStore.getState().saveSessionDraft("ses_r", { text: "旧稿" })
  ideCalls.length = 0
  pendingMod.flushPendingRewindsOnHide()
  assert.equal(storage.readPersistedDraft("ses_r"), `我在打字\n${TEXT}`)
  assert.ok(ideCalls.includes(".session.drafts.save"), "立刻送到 main（不等防抖）")
  assert.deepEqual((storage.readPersistedDraftAssets("ses_r") ?? []).map((a) => a.id), ["ast_a", "ast_b"])
  assert.equal(pendingMod.readPendingRewind("ses_r")?.text, TEXT, "记录留着，下次启动再对一遍")
})

test("#167 r3：pagehide / beforeunload 装上了", () => {
  const src = readFileSync(new URL("./rewind-pending.ts", import.meta.url), "utf8")
  assert.match(src, /addEventListener\?\.\("pagehide", flushPendingRewindsOnHide\)/)
  assert.match(src, /addEventListener\?\.\("beforeunload", flushPendingRewindsOnHide\)/)
  const host = readFileSync(new URL("./rewind-from-here.ts", import.meta.url), "utf8")
  assert.match(host, /^installPendingRewinds\(\)$/m)
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

test("#167 r3：切进一个有待放回记录的会话那一下不写输入框（loadSession 还要恢复它的稿），下一拍再并进去", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  useChatStore.setState({ sessionId: "ses_a", messages: [], composer: "" } as never)
  fakeComposerDom("")
  // 上次进程留下的记录（还没开始轮询）。
  pendingMod.recordPendingRewind("ses_b", TEXT, [{ id: "ast_a", name: "a.png" }])
  const el = fakeComposerDom("")
  // 模拟 loadSession 的同步段：先换会话，紧接着恢复 B 的稿。
  useChatStore.setState({ sessionId: "ses_b", messages: [] } as never)
  useChatStore.getState().setComposer("B 的稿")
  el.value = "B 的稿"
  await tick(40)
  assert.equal(el.value, `B 的稿\n${TEXT}`, "原话并在 B 的稿后面，没被恢复冲掉")
  assert.equal(pendingMod.readPendingRewind("ses_b"), undefined)
})

test("#167 r4 光标：组字结束后放回，光标停在用户自己打的字末尾（原话在下一行），不跳到最后", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => {
    el.value = "我在"
    setComposerComposing(true)
  }
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
  el.value = "我在打字"
  useChatStore.getState().setComposer("我在打字")
  setComposerComposing(false)
  el.caret = null
  ideCalls.length = 0
  await tick(30)
  assert.equal(el.value, `我在打字\n${TEXT}`)
  assert.deepEqual(el.caret, [4, 4], "光标在「我在打字」后面")
  assert.ok(ideCalls.includes(".session.drafts.save"), "放进输入框那一刻就送到 main（不等 300ms 防抖）")
})

test("#167 r4 光标：输入框没焦点时不动光标", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  el.value = "x"
  useChatStore.getState().setComposer("x")
  ;(globalThis as any).document.activeElement = null
  setComposerComposing(false)
  el.caret = null
  await tick(30)
  assert.equal(el.value, `x\n${TEXT}`)
  assert.equal(el.caret, null)
})

test("#167 r4 PR-D：等待中又重来一次（更早那条）→ 记录合并不覆盖：两段原话都在，图并集；落地各一次", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const el = fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
  // 第二次：在更早的 u1 上重来（还在组字）。
  useChatStore.setState({
    messages: [
      { id: "u1", role: "user", content: "first", createdAt: 1, assets: [IMG_B, { assetId: "ast_c", name: "c.png" }] },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 }
    ]
  } as never)
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u1", restoreFiles: false }), { ok: true, writebackPending: true })
  const rec = pendingMod.readPendingRewind("ses_r")
  assert.equal(rec?.text, `${TEXT}\nfirst`, "两段都在，不是只剩第二次的")
  assert.deepEqual(rec?.assets.map((a) => a.id), ["ast_a", "ast_b", "ast_c"])
  el.value = ""
  useChatStore.getState().setComposer("")
  setComposerComposing(false)
  await tick(40)
  assert.equal(el.value, `${TEXT}\nfirst`, "各一次")
  assert.deepEqual(trayIds(), ["ast_a", "ast_b", "ast_c"])
  assert.deepEqual(ids(), [], "两次截掉的都拿掉了")
})

test("#167 r4 PR-F：localStorage 里的待放回记录是坏 JSON / 数组 / 字段不对 → 不抛，当作没有；好的那条照用", () => {
  for (const raw of ["{not json", "[1,2]", "null", "42", JSON.stringify({ a: 1, b: { text: 5 }, c: [] })]) {
    pendingMod.forgetPendingRewindCacheForTest()
    memory.set("enjoy-agents-pending-rewinds", raw)
    assert.doesNotThrow(() => pendingMod.listPendingRewindSessions(), raw)
    assert.deepEqual(pendingMod.listPendingRewindSessions(), [], raw)
    assert.doesNotThrow(() => pendingMod.ensurePendingRewindLoop(), raw)
  }
  pendingMod.forgetPendingRewindCacheForTest()
  memory.set(
    "enjoy-agents-pending-rewinds",
    JSON.stringify({ bad: { text: 1 }, good: { text: "hi", assets: [{ id: "ast_a" }, { name: "no-id" }, null] } })
  )
  assert.deepEqual(pendingMod.listPendingRewindSessions(), ["good"])
  assert.deepEqual(pendingMod.readPendingRewind("good")?.assets.map((a) => a.id), ["ast_a"])
  pendingMod.forgetPendingRewindCacheForTest()
})

test("#167 r4 L13：截掉的消息用库 id（persistedId）重读回来也拿掉；本地 id 换了但 persistedId 是截掉的也拿掉", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  useChatStore.setState({
    messages: [
      { id: "u1", role: "user", content: "first", createdAt: 1 },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 },
      { id: "u2", persistedId: "db_u2", role: "user", content: TEXT, createdAt: 3 },
      { id: "db_a2", role: "assistant", content: "stub-ok", createdAt: 4 }
    ]
  } as never)
  const el = fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
  // 等待中界面被重读：u2 以库 id 出现；a2 换了个本地 id、persistedId 指向库行。
  useChatStore.setState({
    messages: [
      { id: "u1", role: "user", content: "first", createdAt: 1 },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 },
      { id: "db_u2", role: "user", content: TEXT, createdAt: 3 },
      { id: "tmp_a2", persistedId: "db_a2", role: "assistant", content: "stub-ok", createdAt: 4 }
    ]
  } as never)
  el.value = ""
  setComposerComposing(false)
  await tick(30)
  assert.deepEqual(ids(), ["u1", "a1"])
})

test("#167 r4 e)：新对话第一条上重来、原话还在等 → 离开时不当空会话删（渲染侧判断 + main 侧有草稿）", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  useChatStore.setState({
    workspaceId: "ws",
    sessionId: "ses_new",
    running: false,
    composer: "",
    messages: [
      { id: "u1", role: "user", content: TEXT, createdAt: 1 },
      { id: "a1", role: "assistant", content: "ok", createdAt: 2 }
    ]
  } as never)
  const el = fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u1", restoreFiles: false }), { ok: true, writebackPending: true })
  await tick(20)
  assert.ok(String(storage.readPersistedDraft("ses_new")).includes(TEXT), "等待中 main 侧就有草稿（onlyIfEmpty 不删）")
  const leave = { sessionId: "ses_new", messages: [], running: false, composer: el.value }
  assert.equal(emptySessionToDiscardOnLeave(leave, "ses_other"), null, "有待放回记录：不删")
  pendingMod.resetPendingRewindsForTest(null)
  assert.equal(emptySessionToDiscardOnLeave(leave, "ses_other"), "ses_new", "对照：没记录就是空会话")
})

test("#167 r4 L10：切走那一下（同步）就把原话并进离开的会话草稿，不等下一次轮询", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 100_000 })
  seedSession()
  fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
  useChatStore.getState().setComposer("草稿")
  setComposerComposing(false)
  leaveTo("ses_other")
  assert.equal(useChatStore.getState().getSessionDraft("ses_r")?.text, `草稿\n${TEXT}`)
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true)
})

/**
 * 实机 CONDITIONAL 必修 ①（清单 10）：受控 textarea 的真实时序（真 React + 真 useComposerIme 在 headless Chrome 里量到的，
 * e2e/rewind-ime-real-hooks.spec.ts）：写回改了 store + DOM 之后，React 先按旧 shown 提交一次（DOM 改回 typed），
 * effect 再 setShown(merged) 提交第二次（DOM 改成 merged）；每次程序化改 value 光标都落到末尾。
 * 这里的假输入框照这个时序：store.composer 一变，下一个微任务把 DOM 设成旧 shown，再下一个设成新值。
 */
function reactLikeComposerDom(initial: string) {
  let value = initial
  let shown = initial
  let sel: [number, number] = [initial.length, initial.length]
  const el = {
    get value() {
      return value
    },
    set value(next: string) {
      value = next
      sel = [next.length, next.length]
    },
    get selectionStart() {
      return sel[0]
    },
    get selectionEnd() {
      return sel[1]
    },
    getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null),
    setSelectionRange(a: number, b: number) {
      sel = [a, b]
    },
    /** 用户打字 / compositionend：DOM、shown、store 一起变（onChange）。 */
    typed(text: string) {
      value = text
      shown = text
      sel = [text.length, text.length]
      useChatStore.getState().setComposer(text)
    },
    /** 只改 DOM（组字中：store 不跟）。 */
    composing(text: string) {
      value = text
      sel = [text.length, text.length]
    }
  }
  const off = useChatStore.subscribe((state, prev) => {
    if (state.composer === prev.composer) return
    const next = state.composer
    queueMicrotask(() => {
      if (value !== shown) el.value = shown
      queueMicrotask(() => {
        shown = next
        if (value !== shown) el.value = shown
      })
    })
  })
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
  return { el, off }
}

test("必修 ①（清单 10）：延迟写回落地后，React 两次提交把光标冲到末尾 → 再放回用户打的字末尾", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const { el, off } = reactLikeComposerDom("")
  try {
    onTruncate = () => {
      el.composing("我在")
      setComposerComposing(true)
    }
    assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
    el.composing("我在打字")
    setComposerComposing(false)
    el.typed("我在打字")
    await tick(120)
    assert.equal(el.value, `我在打字\n${TEXT}`)
    assert.equal(useChatStore.getState().composer, `我在打字\n${TEXT}`)
    assert.deepEqual([el.selectionStart, el.selectionEnd], [4, 4], "光标在「我在打字」后面，不在原话末尾")
    assert.equal(pendingMod.readPendingRewind("ses_r"), undefined)
  } finally {
    off()
  }
})

test("必修 ①：落地后用户马上挪了光标 / 接着打字 → 不跟用户抢", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  const { el, off } = reactLikeComposerDom("")
  try {
    onTruncate = () => setComposerComposing(true)
    await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
    setComposerComposing(false)
    el.typed("ab")
    // 等写回落地 + React 两次提交（微任务），再在光标跟随的窗口里（≤ 10 帧）由用户把光标放到 1。
    for (let i = 0; i < 200 && el.value !== `ab\n${TEXT}`; i++) await tick(1)
    await Promise.resolve()
    await Promise.resolve()
    el.setSelectionRange(1, 1)
    await tick(120)
    assert.equal(el.value, `ab\n${TEXT}`)
    assert.deepEqual([el.selectionStart, el.selectionEnd], [1, 1], "用户自己放的光标没被改")
  } finally {
    off()
  }
})

test("必修 ②（清单 11 / 14）：等写回时在组字，切走再切回（组字没结束），组字结束把旧组字稿写进 store → 恢复的原话并回输入框，不丢", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  let el = fakeComposerDom("")
  onTruncate = () => {
    el.value = "打的字"
    setComposerComposing(true)
  }
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
  // 切走：组字中 store 没跟，离开时存的草稿是空的；原话并进 ses_r 的草稿、记录停放。
  leaveTo("ses_other")
  await tick(20)
  assert.equal(useChatStore.getState().getSessionDraft("ses_r")?.text, TEXT)
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true)
  // 切回：loadSession 把草稿恢复进 store；输入框还在组字，显示的仍是旧组字稿（useComposerIme 组字中不换 shown）。
  useChatStore.setState({ sessionId: "ses_r", composer: TEXT } as never)
  el = fakeComposerDom("打的字")
  useChatStore.setState({ sessionId: "ses_r" } as never)
  pendingMod.ensurePendingRewindLoop()
  await tick(20)
  assert.ok(pendingMod.readPendingRewind("ses_r"), "组字中：记录还在，等")
  // 组字结束：onCompositionEnd 把旧组字稿写进 store，盖掉了刚恢复的原话。
  setComposerComposing(false)
  useChatStore.getState().setComposer("打的字")
  await tick(30)
  assert.equal(el.value, `打的字\n${TEXT}`, "原话按行并回输入框")
  assert.equal(useChatStore.getState().composer, `打的字\n${TEXT}`)
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined, "落进输入框才删记录")
})

test("必修 ②：停放的会话回到前台、输入框里已经有原话 → 直接删记录，不写输入框、不动光标；停放在后台时不轮询", async () => {
  pendingMod.resetPendingRewindsForTest({ pollMs: 5 })
  seedSession()
  fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false })
  setComposerComposing(false)
  leaveTo("ses_other")
  await tick(20)
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true)
  assert.equal(pendingMod.settlePendingRewind("ses_r"), "parked")
  ideCalls.length = 0
  await tick(40)
  // 只看草稿相关的调用：截断时 void 掉的 refreshAllWorkspaces 链在慢机器（CI windows）上可能这会儿才走到 inbox 等别的 IPC。
  assert.deepEqual(
    ideCalls.filter((path) => path.startsWith(".session.drafts.")),
    [],
    "停放在后台：轮询停了，不反复写草稿 / 送 main"
  )
  assert.equal(pendingMod.pendingRewindLoopRunningForTest(), false, "停放在后台：轮询不跑")
  // 回到 ses_r：草稿恢复进输入框（含原话）。
  const back = useChatStore.getState().getSessionDraft("ses_r")?.text ?? ""
  useChatStore.setState({ sessionId: "ses_r", composer: back } as never)
  const el = fakeComposerDom(back)
  el.caret = null
  useChatStore.setState({ sessionId: "ses_r" } as never)
  pendingMod.ensurePendingRewindLoop()
  await tick(30)
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined, "已在输入框：落地")
  assert.equal(el.value, back, "输入框一个字没动")
  assert.equal(el.caret, null, "光标没动")
  assert.equal(pendingMod.pendingRewindLoopRunningForTest(), false)
})

/**
 * leo r7 S1：停放的会话回到前台要在恢复输入框之后**立刻**判（微任务），不等下一拍轮询（平时 50ms，warned 时 1000ms）。
 * 之前：用户在那一拍之前改了原话那行 → 被再追加一遍；清空了 → 原话复活。
 * 这里轮询故意调得很慢（80ms / warned 1000ms），用户的操作放在微任务之后、下一拍之前（真实时序：loadSession 的同步段里插不进按键）。
 */
async function parkSesR(pollMs: number) {
  pendingMod.resetPendingRewindsForTest({ pollMs })
  seedSession()
  fakeComposerDom("")
  onTruncate = () => setComposerComposing(true)
  assert.deepEqual(await rewindFromUserTurn({ userMessageId: "u2", restoreFiles: false }), { ok: true, writebackPending: true })
  setComposerComposing(false)
  leaveTo("ses_other")
  assert.equal(pendingMod.readPendingRewind("ses_r")?.parked, true)
  assert.equal(useChatStore.getState().getSessionDraft("ses_r")?.text, TEXT)
}

/** 让轮询退到慢拍：前台 ses_other 有一条写输入框就抛错的记录（drain 抓到 → warned，下一拍 1000ms）。 */
async function makeWarned() {
  const domOpts = { throwOnWrite: true }
  fakeComposerDom("", domOpts)
  quiet()
  pendingMod.recordPendingRewind("ses_other", "other text", [])
  pendingMod.ensurePendingRewindLoop()
  for (let i = 0; i < 100 && !pendingMod.pendingRewindWarnedForTest(); i++) await tick(2)
  assert.equal(pendingMod.pendingRewindWarnedForTest(), true, "setup：轮询已退到 1000ms 慢拍")
  assert.equal(pendingMod.pendingRewindLoopRunningForTest(), true)
  domOpts.throwOnWrite = false
}

/** 模拟 loadSession 切回 ses_r 的同步段：换会话 + 把草稿恢复进 store；输入框（DOM）显示 dom（默认就是恢复的稿）。 */
function comeBackToSesR(dom?: string) {
  const back = useChatStore.getState().getSessionDraft("ses_r")?.text ?? ""
  useChatStore.setState({ sessionId: "ses_r", messages: [], composer: back } as never)
  return { el: fakeComposerDom(dom ?? back), back }
}

/** 等到微任务跑完（切回那一下排的立即判定），用户还来不及有任何输入。 */
const microtasks = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

for (const warnedFirst of [false, true]) {
  const tag = warnedFirst ? "（warned：轮询 1000ms 慢拍）" : "（平时轮询）"
  test(`leo r7 S1${tag}：停放的会话回到前台、用户在下一拍之前改了原话那行 → 不再追加原话`, async () => {
    await parkSesR(80)
    if (warnedFirst) await makeWarned()
    const { el, back } = comeBackToSesR()
    assert.equal(back, TEXT)
    await microtasks()
    assert.equal(pendingMod.readPendingRewind("ses_r"), undefined, "切回那一下就判定落地，记录删了")
    if (warnedFirst) assert.equal(pendingMod.pendingRewindWarnedForTest(), false, "warned 重置")
    // 用户在下一拍轮询之前改了那一行（同一行接着打）。
    el.value = `${TEXT} more`
    useChatStore.getState().setComposer(`${TEXT} more`)
    await tick(warnedFirst ? 1100 : 200)
    assert.equal(el.value, `${TEXT} more`, "原话没被再追加一遍")
    assert.equal(useChatStore.getState().composer, `${TEXT} more`)
    pendingMod.flushPendingRewindsOnHide()
    assert.equal(storage.readPersistedDraft("ses_r"), `${TEXT} more`, "关窗也不再并回原话")
  })

  test(`leo r7 S1${tag}：停放的会话回到前台、用户在下一拍之前清空了输入框 → 原话不复活`, async () => {
    await parkSesR(80)
    if (warnedFirst) await makeWarned()
    const { el } = comeBackToSesR()
    await microtasks()
    assert.equal(pendingMod.readPendingRewind("ses_r"), undefined)
    el.value = ""
    useChatStore.getState().setComposer("")
    await tick(warnedFirst ? 1100 : 200)
    assert.equal(el.value, "", "清空的输入框没被写回原话")
    assert.equal(useChatStore.getState().composer, "")
    draftSaves.length = 0
    pendingMod.flushPendingRewindsOnHide()
    assert.ok(!draftSaves.some((d) => d.sessionId === "ses_r" && d.text.includes(TEXT)), "关窗没把原话送回 main")
  })
}

test("leo r7 S1：停放的会话回到前台时恢复的稿里没有原话（重启后丢了）→ 立刻按行并进去（不等轮询），只一次", async () => {
  await parkSesR(100_000)
  // 恢复的稿只剩用户的字（原话丢了）。
  useChatStore.getState().saveSessionDraft("ses_r", { text: "only typed", assets: [] })
  const { el } = comeBackToSesR()
  await microtasks()
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined)
  assert.equal(useChatStore.getState().composer, `only typed\n${TEXT}`)
  assert.equal(el.value, `only typed\n${TEXT}`, "DOM 已是恢复的稿 → 顺手同步")
  assert.deepEqual(trayIds(), ["ast_a", "ast_b"], "图补进托盘")
})

test("leo r7 S1：切回那一下 DOM 里还是上一个会话的字（React 没画）→ 只按 store 合并，不把别的会话的字并进来", async () => {
  await parkSesR(100_000)
  useChatStore.getState().saveSessionDraft("ses_r", { text: "only typed", assets: [] })
  const { el } = comeBackToSesR("other session text")
  await microtasks()
  assert.equal(useChatStore.getState().composer, `only typed\n${TEXT}`)
  assert.equal(el.value, "other session text", "不往画着别的会话的 DOM 里写")
  assert.ok(!useChatStore.getState().composer.includes("other session text"))
})

test("leo r7 S1（warned）：到达时正在组字 → 等组字结束；warned 已重置，组字结束后按平时间隔落地，不等 1000ms", async () => {
  await parkSesR(5)
  await makeWarned()
  setComposerComposing(true)
  const { el } = comeBackToSesR("打的字")
  assert.equal(pendingMod.pendingRewindWarnedForTest(), false, "回到前台那一下 warned 重置")
  await tick(30)
  assert.ok(pendingMod.readPendingRewind("ses_r"), "组字中：记录还在，等")
  setComposerComposing(false)
  useChatStore.getState().setComposer("打的字") // onCompositionEnd 把旧组字稿写进 store
  const started = Date.now()
  for (let i = 0; i < 100 && pendingMod.readPendingRewind("ses_r"); i++) await tick(3)
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined, `组字结束后 ${Date.now() - started}ms 内落地`)
  assert.ok(Date.now() - started < 500, `没等 1000ms 慢拍（${Date.now() - started}ms）`)
  assert.equal(el.value, `打的字\n${TEXT}`)
})

test("leo r7 S1：到达时正在组字 → compositionend 一到就判（不等轮询）", async () => {
  await parkSesR(100_000)
  setComposerComposing(true)
  const { el } = comeBackToSesR("打的字")
  const listeners = new Map<string, Set<() => void>>()
  Object.assign((globalThis as any).document, {
    addEventListener: (type: string, fn: () => void) => void (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(fn),
    removeEventListener: (type: string, fn: () => void) => void listeners.get(type)?.delete(fn)
  })
  await microtasks()
  assert.ok(pendingMod.readPendingRewind("ses_r"), "组字中不判")
  assert.equal(listeners.get("compositionend")?.size, 1)
  // React 根上的 onCompositionEnd 先跑（组字结束、旧组字稿进 store），再冒泡到 document。
  setComposerComposing(false)
  useChatStore.getState().setComposer("打的字")
  for (const fn of listeners.get("compositionend") ?? []) fn()
  await microtasks()
  assert.equal(pendingMod.readPendingRewind("ses_r"), undefined)
  assert.equal(el.value, `打的字\n${TEXT}`)
  assert.equal(listeners.get("compositionend")?.size, 0, "监听摘掉了")
})

/** leo r7 S3：删会话时清掉它的待放回记录，否则 pagehide / 重启会给已删的会话往 main 写孤儿草稿。 */

async function assertNoOrphan(sessionId: string) {
  assert.equal(pendingMod.readPendingRewind(sessionId), undefined, "记录删了")
  assert.ok(!(JSON.parse(memory.get("enjoy-agents-pending-rewinds") ?? "{}") as Record<string, unknown>)[sessionId], "localStorage 里也没了")
  draftSaves.length = 0
  pendingMod.flushPendingRewindsOnHide()
  assert.ok(!draftSaves.some((d) => d.sessionId === sessionId && d.text.includes(TEXT)), "pagehide 没给已删的会话写草稿")
  pendingMod.forgetPendingRewindCacheForTest()
  assert.equal(pendingMod.readPendingRewind(sessionId), undefined, "重启读回也没有")
}

test("leo r7 S3：删除已归档会话（停放的记录）→ 记录一起删，pagehide 不写孤儿草稿", async () => {
  await parkSesR(100_000)
  await lifecycle.deleteArchivedSession("ses_r")
  assert.ok(ideCalls.includes(".session.delete"))
  await assertNoOrphan("ses_r")
})

test("leo r7 S3：清空全部已归档 → 这些会话的记录都删，别的会话的记录留着", async () => {
  await parkSesR(100_000)
  pendingMod.recordPendingRewind("ses_keep", "keep me", [])
  archivedRows = [{ id: "ses_r", workspaceId: "ws" }]
  await lifecycle.deleteAllArchivedSessions()
  await assertNoOrphan("ses_r")
  assert.equal(pendingMod.readPendingRewind("ses_keep")?.text, "keep me")
})

test("leo r7 S3：移除项目（main 连它的会话一起删）→ 侧栏里的和已归档的会话记录都删，别的项目的留着", async () => {
  await parkSesR(100_000)
  pendingMod.recordPendingRewind("ses_arch", TEXT, [])
  pendingMod.recordPendingRewind("ses_keep", "keep me", [])
  useChatStore.setState({
    repositories: [
      { id: "ws2", name: "p2", kind: "workspace" },
      { id: "ses_r", name: "r", kind: "session", parentId: "ws2" },
      { id: "ses_keep", name: "k", kind: "session", parentId: "ws" }
    ]
  } as never)
  archivedRows = [{ id: "ses_arch", workspaceId: "ws2" }]
  try {
    await lifecycle.removeProject("ws2")
  } finally {
    queryClient.clear() // setWorkspacesCache 建的查询带 5 分钟 gc 定时器，不清进程退不了
  }
  assert.ok(ideCalls.includes(".workspace.remove"))
  await assertNoOrphan("ses_r")
  await assertNoOrphan("ses_arch")
  assert.equal(pendingMod.readPendingRewind("ses_keep")?.text, "keep me")
})
