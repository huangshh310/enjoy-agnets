/**
 * jojo P2（#136 r4 产品决定）：「再发一次」只重发被留下的那一句（字 + 它自己的附件），恰好一条消息；
 * 输入框里新打的字 / 新贴的图是下一条草稿：不自动另发、不并进重发、不清掉。
 * 真走 retryKeptDraft → sendComposerMessage → agent.run。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const runs: any[] = []
const calls: string[] = []
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      calls.push(path)
      // 订阅类（onEvent 等）同步返回退订函数。
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return answer(path, args)
    }
  })
}
async function answer(path: string, args: any[]): Promise<any> {
  {
      if (path === ".agent.run") {
        runs.push(args[0])
        return { ok: true, runId: `run_retry_${runs.length}` }
      }
      if (path === ".session.messages" || path.endsWith(".list")) return []
      return undefined
  }
}
;(globalThis as any).window = { ide: bridge("") }
const { useChatStore } = await import("../stores/chat-store.ts")
const { retryKeptDraft, currentRetryKeptDraftPlan } = await import("./retry-kept-draft.ts")
const { retryKeptDraftPlan, composerWithoutKept } = await import("./retry-kept-draft-plan.ts")
const snap = await import("../stores/restored-images-snapshot.ts")
const { dispatchAgentEvent } = await import("../stores/attention/dispatch-agent-event.ts")
const { onPreOutputRolledBack } = await import("../stores/pre-output-rollback-listeners.ts")
const { isDiscardedPreOutputRun } = await import("../stores/discarded-pre-output-runs.ts")
const { resetSentUserTurnsForTest } = await import("../stores/sent-user-turns.ts")
const { failComposerSend } = await import("./runtime-interact/fail-composer-send.ts")
const { sendComposerMessage } = await import("./runtime-interact/send-composer-run.ts")
const { retryCardView } = await import("../components/ai-chat/thread/retry-card-view.ts")
const { readFileSync } = await import("node:fs")
const { readPersistedDraft, readPersistedDraftAssets } = await import("../lib/session-draft-storage.ts")
const assets = await import("./composer-assets.ts")
const { resetQueuedComposerSendForTest, cancelQueuedComposerSend } = await import("./queue-composer-send.ts")
const { resetComposerRunningOwnerForTest } = await import("./runtime-interact/composer-running-owner.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("../stores/discarded-pre-output-runs.ts")
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
afterEach(() => {
  cancelQueuedComposerSend()
  resetQueuedComposerSendForTest()
  resetComposerRunningOwnerForTest()
  resetDiscardedPreOutputRunsForTest()
  assets.clearComposerAssets()
  snap.clearRestoredImages()
  resetSentUserTurnsForTest()
  runs.length = 0
  calls.length = 0
})

/** 发出「看看这张图」+ ast_kept，出字前失败回滚：字和图回输入框。 */
function rolledBackTurn(sessionId: string) {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId: `run_${sessionId}`,
    composer: "",
    error: null,
    hasKey: true,
    modelId: "stub-e2e",
    pendingStreamEvents: [],
    messages: [
      { id: "u1", role: "user", content: "看看这张图", createdAt: 1, assets: [{ assetId: "ast_kept", mediaType: "image/png", name: "kept.png" }] },
      { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
  useChatStore.getState().applyStreamEvent({ type: "run.error", runId: `run_${sessionId}`, message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  assert.equal(useChatStore.getState().composer, "看看这张图")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_kept"])
}

const runText = (input: any) => String(((input?.messages ?? []) as any[]).filter((m) => m.role === "user").at(-1)?.content ?? "")
const runAttachments = (input: any) => (input?.attachments ?? []) as string[]

const plan = () => currentRetryKeptDraftPlan(useChatStore.getState())
const chipIds = () => assets.listComposerAssets().map((a) => a.id)

/** leo r5 MUST 1：点了也不发、输入框一字不动、chip 不动。 */
async function assertFailClosed(composer: string, chips: string[]) {
  assert.equal(plan(), "none")
  retryKeptDraft()
  await flush()
  assert.equal(runs.length, 0, "绝不自动发")
  assert.equal(useChatStore.getState().composer, composer, "输入框一字不截")
  assert.deepEqual(chipIds(), chips)
}

test("jojo P2（E1）：回滚后又打了字、贴了新图 → 输入框已不是原样，按钮隐藏；点了也不发，新字新图原样留着", async () => {
  rolledBackTurn("ses_retry")
  useChatStore.getState().setComposer("看看这张图\n下一条草稿")
  assets.queueComposerAsset("ast_new", "new.png", "image/png")
  await assertFailClosed("看看这张图\n下一条草稿", ["ast_kept", "ast_new"])
})

test("jojo P2（E1）：只贴了新图（没打字）→ 多一张图也算改过：隐藏、不发", async () => {
  rolledBackTurn("ses_retry2")
  assets.queueComposerAsset("ast_new2", "new2.png", "image/png")
  await assertFailClosed("看看这张图", ["ast_kept", "ast_new2"])
})

test("jojo P2（E1）：只多打了一行字（图没动）→ 隐藏、不发；删掉那行 → 立刻恢复，点了只发那一句、输入框清空", async () => {
  rolledBackTurn("ses_retry3")
  useChatStore.getState().setComposer("看看这张图\n还有")
  assert.equal(plan(), "none")
  useChatStore.getState().setComposer("看看这张图")
  assert.equal(plan(), "resend-kept")
  retryKeptDraft()
  await flush()
  assert.equal(runs.length, 1, "恰好一条")
  assert.equal(runText(runs[0]), "看看这张图")
  assert.deepEqual(runAttachments(runs[0]), ["ast_kept"])
  assert.equal(useChatStore.getState().composer, "")
  assert.deepEqual(chipIds(), [])
})

test("jojo P2（E1）：卡片在隐藏时第二行换成「改好后点发送就行，不会自动发出。」/ en「Press Send when you're ready. Nothing goes out on its own.」", async () => {
  const { zhChat } = await import("../i18n/catalogs/zh/chat.ts")
  const { enChat } = await import("../i18n/catalogs/en/chat.ts")
  assert.equal(zhChat.sendFailedEditThenSend, "改好后点发送就行，不会自动发出。")
  assert.equal(enChat.sendFailedEditThenSend, "Press Send when you're ready. Nothing goes out on its own.")
  rolledBackTurn("ses_retry4")
  assets.queueComposerAsset("ast_more", "more.png", "image/png")
  const view = retryCardView({ canRetry: plan() !== "none", running: false, restoredDetail: "已放回", editThenSend: zhChat.sendFailedEditThenSend })
  assert.deepEqual(view, { showRetry: false, detail: "改好后点发送就行，不会自动发出。" })
})

test("leo r5 (a)：那一句被改成「看看这张图片吧」→ 不重发旧句、不剩「片吧」；按钮隐藏", async () => {
  rolledBackTurn("ses_edit")
  useChatStore.getState().setComposer("看看这张图片吧")
  await assertFailClosed("看看这张图片吧", ["ast_kept"])
})

test("leo r5 (b)：还回的「继续」被并进「继续之前先跑一下测试」→ 不发「继续」、不剩「之前先跑一下测试」", async () => {
  useChatStore.setState({
    workspaceId: "ws", sessionId: "ses_merge", running: true, runId: "run_ses_merge", composer: "", error: null,
    hasKey: true, modelId: "stub-e2e", pendingStreamEvents: [],
    messages: [
      { id: "u1", role: "user", content: "继续", createdAt: 1 },
      { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
  useChatStore.getState().applyStreamEvent({ type: "run.error", runId: "run_ses_merge", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  useChatStore.getState().setComposer("继续之前先跑一下测试")
  await assertFailClosed("继续之前先跑一下测试", [])
})

test("leo r5 (c)：用户删了那张图的 chip → 不再把图发出去", async () => {
  rolledBackTurn("ses_chip")
  assets.removeComposerAsset("ast_kept")
  await assertFailClosed("看看这张图", [])
})

test("leo r5 (c-2)：只空白不同（行首行尾）算原样；行内改动（加空格）算改过", async () => {
  rolledBackTurn("ses_ws")
  useChatStore.getState().setComposer("  看看这张图  \n")
  assert.equal(plan(), "resend-kept")
  useChatStore.getState().setComposer("看看 这张图")
  assert.equal(plan(), "none")
  useChatStore.getState().setComposer("  看看这张图  ")
  retryKeptDraft()
  await flush()
  assert.equal(runs.length, 1)
  assert.equal(useChatStore.getState().composer, "")
  assert.equal(composerWithoutKept("看看 这张图", "看看这张图"), null)
  assert.equal(composerWithoutKept("前一行\n看看这张图\n后一行", "看看这张图"), "前一行\n后一行")
  assert.equal(composerWithoutKept("看看这张图吧\n看看这张图", "看看这张图"), "看看这张图吧", "只摘整行那一处")
})

test("luna r5 规则 2：边看卡边改——改字 / 删 chip 立刻隐藏，改回去 / 贴回来立刻恢复（实时判定）", () => {
  rolledBackTurn("ses_live")
  assert.equal(plan(), "resend-kept")
  useChatStore.getState().setComposer("看看这张图片吧")
  assert.equal(plan(), "none")
  useChatStore.getState().setComposer("看看这张图")
  assert.equal(plan(), "resend-kept")
  assets.removeComposerAsset("ast_kept")
  assert.equal(plan(), "none")
  assets.queueComposerAsset("ast_kept", "kept.png", "image/png")
  assert.equal(plan(), "resend-kept")
  // 卡片：按钮与第二行一起切换。
  const restored = "文字和图片已放回输入框，可以直接再发。"
  const edit = "改好后点发送就行，不会自动发出。"
  assert.deepEqual(retryCardView({ canRetry: false, running: false, restoredDetail: restored, editThenSend: edit }), { showRetry: false, detail: edit })
  assert.deepEqual(retryCardView({ canRetry: true, running: false, restoredDetail: restored, editThenSend: edit }), { showRetry: true, detail: restored })
  assert.deepEqual(retryCardView({ canRetry: false, running: false, restoredDetail: null, editThenSend: edit }), { showRetry: false, detail: edit }, "受限卡没有还稿行：接在原因下")
  assert.deepEqual(retryCardView({ canRetry: false, running: true, restoredDetail: null, editThenSend: edit }), { showRetry: true, detail: null }, "重发进行中照常显示（禁用态）")
})

test("leo r5 MUST 2：切走再切回（hydrate setError(null)）→ 快照还在，再发一次照常只发那一句", async () => {
  rolledBackTurn("ses_sw")
  useChatStore.getState().setError(null) // 切会话清红卡
  useChatStore.setState({ sessionId: "ses_other", messages: [], composer: "" } as never)
  assets.clearComposerAssets()
  useChatStore.getState().setError(null)
  // 切回 A：草稿（字 + 图）恢复，卡由 runs.lastError 重新挂上。
  useChatStore.setState({ sessionId: "ses_sw", messages: [], composer: "看看这张图" } as never)
  assets.queueComposerAsset("ast_kept", "kept.png", "image/png")
  useChatStore.getState().setError("provider_unreachable")
  assert.ok(snap.restoredImagesFor("ses_sw"), "快照按会话存，切走不丢")
  assert.equal(plan(), "resend-kept")
  retryKeptDraft()
  await flush()
  assert.equal(runs.length, 1)
  assert.deepEqual(runAttachments(runs[0]), ["ast_kept"])
})

test("leo r5 MUST 2：没有快照（重启后 / 别处来的失败）→ 不给按钮，也绝不发整个输入框", async () => {
  rolledBackTurn("ses_restart")
  snap.clearRestoredImages() // 重启：内存快照没了
  useChatStore.getState().setComposer("看看这张图\n下一条")
  await assertFailClosed("看看这张图\n下一条", ["ast_kept"])
})

test("leo r5 MUST 2 + jojo r5 P2 + soft2：后台出字前回滚——拍快照（字 + 图）、首句标题复原、作废 runId；标题精炼（completion）的同类事件不算", async () => {
  // A 发出首句带图，然后用户切走。
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_bg", running: true, runId: null, composer: "", error: null, hasKey: true, modelId: "stub-e2e", messages: [], pendingStreamEvents: [] } as never)
  useChatStore.getState().appendUserMessage("后台这一句", [{ assetId: "ast_bg", mediaType: "image/png", name: "bg.png" }] as never)
  useChatStore.setState({ sessionId: "ses_front", running: false, runId: null, messages: [], composer: "前台草稿" } as never)
  const rolled: Array<{ sessionId: string; userTurnsLeft: number }> = []
  const off = onPreOutputRolledBack((info) => rolled.push(info))
  try {
    // 标题精炼（completion）跑在同一会话上：它的出字前失败不是这一句回滚。
    dispatchAgentEvent({ type: "run.start", runId: "run_title", sessionId: "ses_bg", kind: "completion" } as never)
    dispatchAgentEvent({ type: "run.error", runId: "run_title", sessionId: "ses_bg", message: "provider_unreachable", code: "provider_unreachable", preOutput: true, kind: "completion" } as never)
    assert.equal(snap.restoredImagesFor("ses_bg"), null, "completion 不拍快照")
    assert.deepEqual(rolled, [])
    dispatchAgentEvent({ type: "run.error", runId: "run_bg", sessionId: "ses_bg", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  } finally {
    off()
  }
  const kept = snap.restoredImagesFor("ses_bg")?.kept
  assert.equal(kept?.text, "后台这一句")
  assert.deepEqual(kept?.assets.map((a) => a.id), ["ast_bg"])
  assert.equal(snap.restoredImagesFor("ses_bg")?.images, 1)
  assert.deepEqual(rolled, [{ sessionId: "ses_bg", userTurnsLeft: 0 }], "首句标题复原")
  assert.ok(isDiscardedPreOutputRun("run_bg"), "迟到的 agent.run 回执走 discarded，不当孤儿去还稿")
  // 当前会话不受影响。
  assert.equal(useChatStore.getState().composer, "前台草稿")
  assert.deepEqual(chipIds(), [])
  // 切回 A：草稿恢复（字 + 图）后照常可重发那一句。
  useChatStore.setState({ sessionId: "ses_bg", messages: [], composer: "后台这一句" } as never)
  assets.queueComposerAsset("ast_bg", "bg.png", "image/png")
  assert.equal(plan(), "resend-kept")
})

test("jojo r5 P1：发送失败还稿时用户已切到别的会话——稿还回发出的会话，当前输入框 / chip / 红卡不动", () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_now", running: true, runId: "run_now", composer: "B 的草稿", error: null, messages: [] } as never)
  assets.queueComposerAsset("ast_now", "now.png", "image/png")
  failComposerSend({ text: "甲句带图A", reason: "send_failed", sessionId: "ses_gone", assets: [{ id: "ast_a", name: "a.png", mediaType: "image/png" }] as never })
  const s = useChatStore.getState()
  assert.equal(s.composer, "B 的草稿")
  assert.deepEqual(chipIds(), ["ast_now"])
  assert.equal(s.error, null)
  assert.equal(s.running, true, "不动当前会话的 running")
  // 稿回到发出的那个会话（字 + 图），切回去两样都在。
  assert.equal(readPersistedDraft("ses_gone"), "甲句带图A")
  assert.deepEqual(readPersistedDraftAssets("ses_gone")?.map((a) => a.id), ["ast_a"])
})

test("卡片接线：两张卡都按 retryCardView + useRetryKeptDraftAvailable 显隐；hook 实时订阅快照 / chip / 输入框", () => {
  for (const file of ["thread-credential-network-notice.tsx", "thread-credential-restricted-notice.tsx"]) {
    const src = readFileSync(new URL(`../components/ai-chat/thread/${file}`, import.meta.url), "utf8")
    assert.match(src, /retryCardView\(\{\s*canRetry: useRetryKeptDraftAvailable\(\)/)
    assert.match(src, /chat\.sendFailedEditThenSend/)
    assert.match(src, /detail=\{view\.detail\}/)
    assert.match(src, /view\.showRetry \? retryKeptDraft : undefined/)
  }
  const hook = readFileSync(new URL("./retry-kept-draft.ts", import.meta.url), "utf8")
  assert.match(hook, /useSyncExternalStore\(subscribeRestoredImages, getRestoredImagesSnapshots\)/)
  assert.match(hook, /useSyncExternalStore\(subscribeAssetsVersion/)
  assert.match(hook, /useChatStore\(\(s\) => s\.composer\)/)
  assert.doesNotMatch(hook, /sendComposerMessage\(\)/, "没有「发整个输入框」的兜底")
})

test("纯判定：kept 优先；用户句还在线程走 retry-turn；其余 none（不再有 send）", () => {
  assert.equal(retryKeptDraftPlan({ kept: null, lastUserPending: true, composer: "x", composerAssetIds: ["n"] }), "retry-turn")
  assert.equal(retryKeptDraftPlan({ kept: null, lastUserPending: false, composer: "x", composerAssetIds: ["n"] }), "none")
  // jojo P2（E1）：必须正好相等——多字、多图、少图都不给。
  assert.equal(retryKeptDraftPlan({ kept: { text: "", assetIds: ["k"] }, lastUserPending: false, composer: "新字", composerAssetIds: ["k", "n"] }), "none")
  assert.equal(retryKeptDraftPlan({ kept: { text: "", assetIds: ["k"] }, lastUserPending: false, composer: "", composerAssetIds: ["k", "n"] }), "none")
  assert.equal(retryKeptDraftPlan({ kept: { text: "", assetIds: ["k"] }, lastUserPending: false, composer: "新字", composerAssetIds: ["k"] }), "none")
  assert.equal(retryKeptDraftPlan({ kept: { text: "", assetIds: ["k"] }, lastUserPending: false, composer: " ", composerAssetIds: ["k"] }), "resend-kept")
  assert.equal(retryKeptDraftPlan({ kept: { text: "a", assetIds: ["k", "j"] }, lastUserPending: false, composer: "a", composerAssetIds: ["j", "k"] }), "resend-kept", "图的顺序不算")
  assert.equal(retryKeptDraftPlan({ kept: { text: "a", assetIds: [] }, lastUserPending: false, composer: "a\nb", composerAssetIds: [] }), "none")
  assert.equal(retryKeptDraftPlan({ kept: { text: "", assetIds: ["k"] }, lastUserPending: false, composer: "", composerAssetIds: ["n"] }), "none")
})

test("luna 锁定文案（规则 1）：回滚后再发被闸拦（输入框没清空过）→ 本会话快照作废：白卡不带「…已放回」、不给「再发一次」", async () => {
  rolledBackTurn("ses_gate2")
  assert.ok(snap.restoredImagesFor("ses_gate2"))
  useChatStore.setState({ running: false, workspaceKind: "ssh", remoteStatus: "disconnected" } as never)
  await sendComposerMessage()
  await flush()
  useChatStore.setState({ workspaceKind: "local", remoteStatus: null } as never)
  assert.equal(runs.length, 0, "闸拦：没发出去")
  assert.ok(useChatStore.getState().error, "闸拦给了原因")
  assert.equal(snap.restoredImagesFor("ses_gate2"), null)
  assert.equal(plan(), "none")
  assert.equal(useChatStore.getState().composer, "看看这张图", "闸拦不清输入框")
})

test("jojo r5 P1（左上返回）：切到会话一后 runId 没重置，A 的出字前失败仍按 A 的会话走后台——不撕会话一、不改它的输入框 / 红卡", () => {
  // A 发出（乐观泡 + 记下这一句），run.start 已认领 runId。
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_A", running: true, runId: "run_A", composer: "", error: null, hasKey: true, modelId: "stub-e2e", messages: [], pendingStreamEvents: [] } as never)
  useChatStore.getState().appendUserMessage("甲句带图A", [{ assetId: "ast_A", mediaType: "image/png", name: "a.png" }] as never)
  // 左上返回：会话换成一，消息换成一的，但 running / runId 还挂着 A 的。
  const oneMessages = [
    { id: "u1", role: "user", content: "会话一成功", createdAt: 1 },
    { id: "a1", role: "assistant", content: "stub-ok 会话一成功", createdAt: 2 }
  ]
  useChatStore.setState({ sessionId: "ses_one", messages: oneMessages, composer: "" } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_A", sessionId: "ses_A", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  const s = useChatStore.getState()
  assert.equal(s.composer, "", "会话一的输入框不被写")
  assert.deepEqual(chipIds(), [])
  assert.equal(s.error, null, "A 的卡不挂到会话一")
  assert.deepEqual(s.messages, oneMessages)
  assert.equal(snap.restoredImagesFor("ses_one"), null)
  assert.equal(snap.restoredImagesFor("ses_A")?.kept.text, "甲句带图A", "按 A 的后台回滚拍快照")
})

test("jojo r5 P1（左上返回到「新对话」落地页，sessionId 为空）：A 的失败同样不撕在落地页上", () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_A2", running: true, runId: "run_A2", composer: "", error: null, hasKey: true, modelId: "stub-e2e", messages: [], pendingStreamEvents: [] } as never)
  useChatStore.getState().appendUserMessage("落地页别冒", undefined)
  useChatStore.setState({ sessionId: null, messages: [], composer: "落地页草稿" } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_A2", sessionId: "ses_A2", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  const s = useChatStore.getState()
  assert.equal(s.composer, "落地页草稿")
  assert.equal(s.error, null)
  assert.equal(snap.restoredImagesFor("ses_A2")?.kept.text, "落地页别冒")
})
