/**
 * luna #163 合并后巡检 P1（m211）：失败那一条还没发出去（卡上 / 写回输入框）时，「继续」不许先把排队的发出去。
 * 「还没发出去」= pending-failed-send 按会话记的一笔：失败时记，失败那条发出去跑完（run.end）或输入框里不再有它时清。
 * P2：密钥没通过时按发送 → 卡上「先改好密钥再发。」，不静默；改好密钥后先发失败那条，跑完排队接着发。
 * P3：停止后「改一下再发」发出去跑完 → 说明行改成「排队的 N 条先不发。」。
 * 真走 dispatchAgentEvent（出字前回滚）/ sendComposerMessage（发送闸）/ continueFollowups；自启用 useFollowupAutostart 同款 kick。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
let dbAssets: Record<string, Array<Record<string, unknown>>> = {}
const ideCalls: string[] = []
const throwOn = new Set<string>()
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      ideCalls.push(path)
      if (throwOn.has(path)) return Promise.reject(new Error("socket hang up"))
      if (path === ".session.drafts.loadSync") return {}
      if (path === ".session.drafts.loadAssetsSync") return JSON.parse(JSON.stringify(dbAssets))
      if (path === ".session.drafts.saveAssets") {
        const input = args[0] as { sessionId: string; assets: Array<Record<string, unknown>> }
        if (input.assets.length) dbAssets[input.sessionId] = input.assets
        else delete dbAssets[input.sessionId]
        return undefined
      }
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../stores/chat-store.ts")
const queue = await import("./followup-queue.ts")
const { tryStartNextFollowup, resetFollowupAutostart, drainFollowupAutostart } = await import("./followup-autostart.ts")
const { dispatchAgentEvent } = await import("../stores/attention/dispatch-agent-event.ts")
const pause = await import("./followup-pause.ts")
const actions = await import("./runtime-interact/followup-pause-actions.ts")
const view = await import("../components/ai-chat/thread/queue-paused-view.ts")
const storage = await import("../lib/session-draft-storage.ts")
const assets = await import("./composer-assets.ts")
const { zhChat } = await import("../i18n/catalogs/zh/chat.ts")
const { enChat } = await import("../i18n/catalogs/en/chat.ts")
const pending = await import("./pending-failed-send.ts")
const nudge = await import("./credential-send-nudge.ts")
const { sendComposerMessage } = await import("./runtime-interact/send-composer-run.ts")
const { retryKeptDraft } = await import("./retry-kept-draft.ts")
const { buildChatReadiness } = await import("@enjoy-agents/ipc-contract/chat-readiness")
const { rememberChatReadiness, rememberCodingRuntime } = await import("./chat-readiness-cache.ts")
const { readFileSync } = await import("node:fs")
const off = storage.installSessionDraftPersistence()

const sent: string[] = []
function kick(): boolean {
  const store = useChatStore.getState()
  return tryStartNextFollowup({
    sessionId: store.sessionId,
    running: store.running,
    pendingApproval: Boolean(store.pendingApproval),
    send: async (item) => {
      sent.push(item.prompt)
      useChatStore.setState({ running: true } as never)
    }
  })
}
const unsubscribe = queue.subscribeFollowups(() => void kick())

afterEach(async () => {
  await drainFollowupAutostart()
  queue.resetFollowupsForTest()
  pending.resetPendingFailedSendForTest()
  nudge.resetCredentialSendNudgeForTest()
  resetFollowupAutostart()
  assets.clearComposerAssets()
  storage.resetPersistedDraftAssetsForTest()
  rememberChatReadiness(undefined)
  dbAssets = {}
  sent.length = 0
  ideCalls.length = 0
  throwOn.clear()
  delete (globalThis as any).document
})
test.after(() => {
  unsubscribe()
  off()
})

const zh = (key: string, vars?: Record<string, string | number>) => fill((zhChat as any)[key.replace(/^chat\./, "")] ?? key, vars)
const en = (key: string, vars?: Record<string, string | number>) => fill((enChat as any)[key.replace(/^chat\./, "")] ?? key, vars)
function fill(text: string, vars?: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m))
}
const named = (name: string) => ({ kind: "named" as const, name })
const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0))
  await drainFollowupAutostart()
}
const prompts = (sid: string) => queue.listFollowups(sid).map((i) => i.prompt)

/** 前台会话发出 text，还没出字（末尾挂着空的乐观助手轮），排队里有 queued。 */
function inFlightTurn(sessionId: string, text: string, ...queued: string[]) {
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: true, runId: `run_${sessionId}`, composer: "", error: null, notice: null,
    pendingApproval: null, hasKey: true, pendingStreamEvents: [], preparingHint: false, preparingSessionId: null,
    messages: [
      { id: "u1", role: "user", content: text, createdAt: 1 },
      { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
  for (const prompt of queued) queue.enqueueFollowup({ sessionId, prompt, assets: [] })
}
function preOutputFail(sessionId: string, code: string, runId = `run_${sessionId}`) {
  dispatchAgentEvent({ type: "run.error", runId, sessionId, message: code, code, preOutput: true } as never)
}
/** 排队行此刻怎么画（与 QueuePausedRow 同一条链：放弃判断 → 位置 → 视图）。 */
function row(sessionId: string, t: typeof zh, opts: { retryShowing?: boolean; provider?: ReturnType<typeof named> } = {}) {
  const still = actions.failedSendStillPending(sessionId)
  const store = useChatStore.getState()
  const place = pending.pendingFailedSendPlace(still ? pending.pendingFailedSendFor(sessionId) : null, {
    composerText: store.composer,
    composerAssetIds: assets.listComposerAssets().map((a) => a.id),
    failureCardRetryShowing: opts.retryShowing ?? false
  })
  return view.queuePausedView({
    reason: queue.followupPausedReason(sessionId)!,
    count: queue.listFollowups(sessionId).length,
    composerHasContent: Boolean(store.composer.trim()),
    pendingFailed: place,
    provider: opts.provider ?? named("OpenAI"),
    t: t as never
  })
}

// ---------------- P1 三条路径 ----------------

test("P1 路径①：额度卡 →「换个模型」（卡收起）→ 稿在输入框没发：不给继续、不给改一下再发；句子说先发输入框里这条；点继续也不发排队", async () => {
  inFlightTurn("ses_q", "hello quota", "B1", "B2")
  preOutputFail("ses_q", "provider_billing")
  assert.equal(queue.followupPausedReason("ses_q"), "quota")
  assert.equal(useChatStore.getState().composer, "hello quota", "失败那条写回输入框")
  assert.equal(pending.pendingFailedSendFor("ses_q")?.where, "composer")
  // 卡上还在（再发一次露着）
  const onCard = row("ses_q", zh, { retryShowing: true })
  assert.deepEqual([onCard.showContinue, onCard.showEditFirst], [false, false])
  // 换个模型：卡收起，失败那条仍在输入框——换模型不算发出去。
  useChatStore.getState().setError(null)
  const v = row("ses_q", zh)
  assert.deepEqual([v.showContinue, v.showEditFirst], [false, false])
  assert.equal(v.text, "OpenAI 额度用完了，排队的 2 条先不发。充值后先发输入框里这条，发出去后排队的会接着发。")
  assert.doesNotMatch(v.text, /点继续/)
  assert.equal(row("ses_q", en).text, "OpenAI is out of credit, so 2 queued messages are on hold. Top up, then send the message in the box. The queue continues after it goes through.")
  useChatStore.setState({ running: false } as never)
  actions.continueFollowups("ses_q")
  assert.equal(actions.editFirstFollowup("ses_q"), null, "改一下再发同样拦住")
  await flush()
  assert.deepEqual(sent, [], "排队的没抢在 hello quota 前面")
  assert.equal(queue.followupPausedReason("ses_q"), "quota")
  assert.deepEqual(prompts("ses_q"), ["B1", "B2"])
})

test("P1 路径②：受限卡点 × → 稿在输入框：不出继续；句尾「先发输入框里这条，发出去后排队的会接着发。」，不再叫人点继续", async () => {
  inFlightTurn("ses_r", "hello restricted", "B1")
  preOutputFail("ses_r", "provider_forbidden")
  assert.equal(queue.followupPausedReason("ses_r"), "error")
  useChatStore.getState().setError(null)
  const v = row("ses_r", zh)
  assert.equal(v.showContinue, false)
  assert.equal(v.text, `${zh("chat.queuePausedErrorOne", { n: 1 })}${zh("chat.queuePausedComposerFirst")}`)
  assert.ok(v.text.endsWith("先发输入框里这条，发出去后排队的会接着发。"), v.text)
  assert.doesNotMatch(v.text, /点继续/)
  useChatStore.setState({ running: false } as never)
  actions.continueFollowups("ses_r")
  await flush()
  assert.deepEqual(sent, [])
})

test("P1 路径③：密钥没通过（英文）卡还在、卡上没有重试：不出 Continue；句尾 Send the message in the box first…", async () => {
  inFlightTurn("ses_k", "hello key", "B1", "B2")
  preOutputFail("ses_k", "credential_invalid")
  assert.equal(useChatStore.getState().error !== null, true, "卡在")
  const v = row("ses_k", en, { retryShowing: false })
  assert.equal(v.showContinue, false)
  assert.equal(v.showEditFirst, false)
  assert.ok(v.text.endsWith(" Send the message in the box first. The queue continues after it goes through."), v.text)
  assert.doesNotMatch(v.text, /press Continue/i)
})

// ---------------- 「清掉」的定义 → 继续 ----------------

test("清空输入框 → 失败那条算放弃：记录清掉，句子回到「…点继续。」，继续按顺序发排队第一条", async () => {
  inFlightTurn("ses_c", "hello quota", "B1", "B2")
  preOutputFail("ses_c", "provider_billing")
  useChatStore.getState().setError(null)
  useChatStore.setState({ running: false, composer: "" } as never)
  const v = row("ses_c", zh)
  assert.equal(pending.pendingFailedSendFor("ses_c"), null, "整条清掉 → 记录清掉")
  assert.deepEqual([v.showContinue, v.showEditFirst], [true, true])
  assert.equal(v.text, "OpenAI 额度用完了，排队的 2 条先不发。充值后点继续。")
  actions.continueFollowups("ses_c")
  await flush()
  assert.deepEqual(sent, ["B1"])
})

test("「清掉」的边界：改几个字 / 只删字留图 / 加一行 → 仍算没发；换成完全不相干的一句 → 算放弃", () => {
  const entry = { sessionId: "s", where: "composer" as const, text: "第一行\n第二行", assetIds: ["img1"], inFlight: false }
  const abandoned = (text: string, assetIds: string[] = []) => pending.failedSendAbandoned(entry, { text, assetIds })
  assert.equal(abandoned(""), true, "字和图都没了")
  assert.equal(abandoned("", ["img1"]), false, "字删了图还在")
  assert.equal(abandoned("第一行"), false, "留着一整行")
  assert.equal(abandoned("前面补一句\n第一行\n第二行"), false)
  assert.equal(abandoned("第一行改了\n第二行改了"), false, "整行包含（行内补字）仍算还在")
  assert.equal(abandoned("完全不同的话"), true)
  assert.equal(abandoned("   "), true, "只剩空白")
  assert.equal(pending.failedSendAbandoned({ ...entry, inFlight: true }, { text: "", assetIds: [] }), false, "正在发出去时不算放弃")
  assert.equal(pending.failedSendAbandoned({ ...entry, where: "thread" }, { text: "", assetIds: [] }), false, "留在时间线上的那一轮与输入框无关")
  assert.equal(pending.failedSendAbandoned({ ...entry, text: "" , assetIds: [] }, { text: "后台回滚、原文没记到", assetIds: [] }), false)
})

// ---------------- 成功 → 自动接着发 ----------------

test("发出去跑完 → 自动接着发：从输入框发出（标记在发）→ run.start → run.end → 解除，排队的按顺序跟在后面", async () => {
  inFlightTurn("ses_ok", "hello quota", "B1", "B2")
  preOutputFail("ses_ok", "provider_billing")
  useChatStore.getState().setError(null)
  // 发送路径（sendComposerMessage 输入框手势）在闸前标记「在发」——源码钉见下一条。
  pending.markPendingFailedSendInFlight("ses_ok")
  useChatStore.setState({ running: true, runId: "run_again", composer: "" } as never)
  dispatchAgentEvent({ type: "run.start", runId: "run_again", sessionId: "ses_ok" } as never)
  assert.equal(queue.followupPausedReason("ses_ok"), "quota", "开跑不算成功")
  assert.equal(row("ses_ok", zh).showContinue, false, "在发时也不出继续")
  dispatchAgentEvent({ type: "run.end", runId: "run_again", sessionId: "ses_ok" } as never)
  assert.equal(queue.followupPausedReason("ses_ok"), null)
  assert.equal(pending.pendingFailedSendFor("ses_ok"), null)
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(sent, ["B1"])
})

test("在发的那一发又失败（run.error）→ 仍停着，重新记成「没发出去」；没在发时别的一轮跑完（立即发某条排队）不解除", async () => {
  inFlightTurn("ses_again", "hello", "B1", "B2")
  preOutputFail("ses_again", "provider_billing")
  pending.markPendingFailedSendInFlight("ses_again")
  useChatStore.setState({ running: true, runId: "run_again2", composer: "", messages: [{ id: "u1", role: "user", content: "hello", createdAt: 1 }, { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }] } as never)
  preOutputFail("ses_again", "provider_billing", "run_again2")
  assert.equal(queue.followupPausedReason("ses_again"), "quota")
  assert.equal(pending.pendingFailedSendFor("ses_again")?.inFlight, false)
  dispatchAgentEvent({ type: "run.end", runId: "run_other", sessionId: "ses_again" } as never)
  assert.equal(queue.followupPausedReason("ses_again"), "quota", "不是失败那条跑完：不解除")
})

test("重新生成 / 编辑重发出字前失败、用户句留在线程里（keptUserMessage）→ 也算没发出去：输入框空着也不给继续 / 改一下再发", async () => {
  inFlightTurn("ses_th", "留在线程里的那句", "B1")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_th", sessionId: "ses_th", message: "provider_unreachable", code: "provider_unreachable", preOutput: true, keptUserMessage: true } as never)
  assert.equal(useChatStore.getState().messages.at(-1)?.role, "user", "用户句留着")
  assert.equal(pending.pendingFailedSendFor("ses_th")?.where, "thread")
  useChatStore.setState({ running: false, composer: "" } as never)
  const v = row("ses_th", zh, { retryShowing: false })
  assert.equal(v.showContinue, false)
  assert.ok(v.text.endsWith(zh("chat.queuePausedResendFirst")), v.text)
  assert.equal(actions.editFirstFollowup("ses_th"), null, "输入框空着也不把排队第一条拿出来")
  assert.deepEqual(prompts("ses_th"), ["B1"])
  actions.continueFollowups("ses_th")
  await flush()
  assert.deepEqual(sent, [])
})

test("在发的那一发出了字后才报错（不回滚）= 已经发出去了：清掉记录（之后清空输入框 / 继续照常）", () => {
  inFlightTurn("ses_post", "hello", "B1")
  queue.pauseFollowups("ses_post", "error")
  pending.notePendingFailedSend("ses_post", { where: "composer", text: "hello" })
  pending.markPendingFailedSendInFlight("ses_post")
  useChatStore.setState({ messages: [{ id: "u1", role: "user", content: "hello", createdAt: 1 }, { id: "a1", role: "assistant", content: "写了一半", createdAt: 2, streaming: true }] } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_post", sessionId: "ses_post", message: "provider_unreachable", code: "provider_unreachable", preOutput: false } as never)
  assert.equal(pending.pendingFailedSendFor("ses_post"), null)
})

test("卡上「再发一次」也标记在发（resend-kept）：跑完自动接着发", async () => {
  inFlightTurn("ses_rk", "hello", "B1")
  preOutputFail("ses_rk", "provider_unreachable")
  useChatStore.setState({ running: false } as never)
  const seen: boolean[] = []
  const stop = pending.subscribePendingFailedSend(() => seen.push(pending.pendingFailedSendFor("ses_rk")?.inFlight === true))
  retryKeptDraft()
  stop()
  assert.deepEqual(seen.slice(0, 1), [true], "点下去先标记在发")
  await flush()
})

test("源码钉：输入框手势发送在闸前标记在发；闸放行清掉密钥提醒", () => {
  const src = readFileSync(new URL("./runtime-interact/send-composer-run.ts", import.meta.url), "utf8")
  assert.match(src, /if \(!prepared\) markPendingFailedSendInFlight\(store\.sessionId\)/)
  assert.ok(src.indexOf("markPendingFailedSendInFlight(store.sessionId)") < src.indexOf("if (!guardComposerSend(store))"))
  assert.match(src, /\r?\n  clearCredentialSendBlocked\(store\.sessionId\)\r?\n  syncReviewGateOnComposerStart/)
})

test("停止 / 换助手仍不自动放行：失败那条发出去跑完也只是清掉记录，不解除暂停", async () => {
  inFlightTurn("ses_stop", "hello", "B1")
  queue.pauseFollowups("ses_stop", "stopped")
  pending.notePendingFailedSend("ses_stop", { where: "composer", text: "hello" })
  pending.markPendingFailedSendInFlight("ses_stop")
  dispatchAgentEvent({ type: "run.start", runId: "run_x", sessionId: "ses_stop" } as never)
  dispatchAgentEvent({ type: "run.end", runId: "run_x", sessionId: "ses_stop" } as never)
  assert.equal(pending.pendingFailedSendFor("ses_stop"), null)
  assert.notEqual(queue.followupPausedReason("ses_stop"), null)
  queue.pauseFollowups("ses_sw", "engineSwitched")
  queue.enqueueFollowup({ sessionId: "ses_sw", prompt: "B", assets: [] })
  queue.pauseFollowups("ses_sw", "engineSwitched")
  pending.notePendingFailedSend("ses_sw", { where: "composer", text: "x" })
  pending.markPendingFailedSendInFlight("ses_sw")
  dispatchAgentEvent({ type: "run.end", runId: "run_y", sessionId: "ses_sw" } as never)
  assert.equal(queue.followupPausedReason("ses_sw"), "engineSwitched")
})

// ---------------- P2 密钥 ----------------

function keyReadiness(state: "invalid" | "ok") {
  rememberCodingRuntime("local")
  rememberChatReadiness(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "p", presetId: "openai" }],
      engineCount: 1,
      hasEnjoySecret: true,
      credentialCheck: state === "invalid" ? { state: "invalid", code: "auth_rejected" } : { state: "ok" }
    } as never)
  )
}
function fakeComposerDom(domText: string) {
  const el = { value: domText, getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
  return el
}

test("P2 没改好密钥就按发送：被闸拦下 → 卡上记「先改好密钥再发。」（不静默）；稿留在输入框、仍算没发；不出继续、继续也不发", async () => {
  inFlightTurn("ses_p2", "hello key", "B1", "B2")
  useChatStore.setState({ runtimeId: "enjoy-local", modelId: "gpt" } as never)
  preOutputFail("ses_p2", "credential_invalid")
  keyReadiness("invalid")
  fakeComposerDom("hello key")
  await sendComposerMessage(undefined, "hello key")
  assert.equal(nudge.credentialSendBlocked("ses_p2"), true)
  assert.equal(useChatStore.getState().error, "credential_invalid")
  assert.equal(useChatStore.getState().composer, "hello key")
  assert.equal(pending.pendingFailedSendFor("ses_p2")?.inFlight, false)
  assert.equal(nudge.credentialInvalidDetail(zh("chat.credentialFixKeyFirst"), null), "先改好密钥再发。")
  assert.equal(nudge.credentialInvalidDetail(en("chat.credentialFixKeyFirst"), "Your text is back in the box."), "Fix the key first, then send. Your text is back in the box.")
  assert.equal(nudge.credentialInvalidDetail(zh("chat.credentialFixKeyFirst"), "字已放回输入框。"), "先改好密钥再发。字已放回输入框。")
  assert.equal(nudge.credentialInvalidDetail(null, "x"), "x")
  const v = row("ses_p2", zh)
  assert.equal(v.showContinue, false)
  actions.continueFollowups("ses_p2")
  await flush()
  assert.deepEqual(sent, [], "排队第一条没被拼进输入框 / 发出去")
  assert.equal(useChatStore.getState().composer, "hello key", "继续不往输入框里拼排队那条")
  assert.deepEqual(prompts("ses_p2"), ["B1", "B2"])
})

test("P2 改好密钥后按发送：闸放行 → 提醒清掉、失败那条标记在发（先发它）；跑完排队接着发", async () => {
  inFlightTurn("ses_p2b", "hello key", "B1")
  useChatStore.setState({ runtimeId: "enjoy-local", modelId: "gpt" } as never)
  preOutputFail("ses_p2b", "credential_invalid")
  nudge.noteCredentialSendBlocked("ses_p2b")
  keyReadiness("ok")
  fakeComposerDom("hello key")
  const seen: boolean[] = []
  const stop = pending.subscribePendingFailedSend(() => seen.push(pending.pendingFailedSendFor("ses_p2b")?.inFlight === true))
  await sendComposerMessage(undefined, "hello key").catch(() => undefined)
  stop()
  assert.equal(nudge.credentialSendBlocked("ses_p2b"), false, "闸放行就清掉提醒")
  assert.ok(seen.includes(true), "发出时标记在发")
  assert.deepEqual(sent, [], "失败那条发出去之前排队的不动")
  // 那一发跑完（真实 agent.run 由桥接模拟不了，这里补上它的事件）。
  pending.markPendingFailedSendInFlight("ses_p2b")
  dispatchAgentEvent({ type: "run.start", runId: "run_k2", sessionId: "ses_p2b" } as never)
  dispatchAgentEvent({ type: "run.end", runId: "run_k2", sessionId: "ses_p2b" } as never)
  assert.equal(queue.followupPausedReason("ses_p2b"), null)
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(sent, ["B1"])
})

test("P2 卡接线（源码）：密钥卡订阅提醒，detail 走 credentialInvalidDetail；文案中英都在", () => {
  const src = readFileSync(new URL("../components/ai-chat/thread/thread-credential-invalid-notice.tsx", import.meta.url), "utf8")
  assert.match(src, /useSyncExternalStore\(subscribeCredentialSendBlocked, getCredentialSendBlocked\)/)
  assert.match(src, /t\("chat\.credentialFixKeyFirst"\)/)
  // 卡关掉就不再提醒（下次再被拦下重新记）。
  assert.match(src, /onDismiss=\{\(\) => \{[\s\S]*?clearCredentialSendBlocked\(sessionId\)[\s\S]*?onDismiss\(\)/)
  assert.equal((zhChat as any).credentialFixKeyFirst, "先改好密钥再发。")
  assert.equal((enChat as any).credentialFixKeyFirst, "Fix the key first, then send.")
})

// ---------------- P3 ----------------

test("P3 停止后「改一下再发」发出去跑完 → 说明行「排队的 N 条先不发。」（中英、单数）；仍不自动发、继续还在", async () => {
  inFlightTurn("ses_p3", "先做这个", "B1", "B2", "B3")
  queue.pauseFollowups("ses_p3", "stopped")
  useChatStore.setState({ running: false, runId: null } as never)
  // 被停那一轮迟到的 run.end（没有新的 run.start）：仍是「你停止了上一轮」。
  dispatchAgentEvent({ type: "run.end", runId: "run_ses_p3", sessionId: "ses_p3" } as never)
  assert.equal(queue.followupPausedReason("ses_p3"), "stopped")
  const item = actions.editFirstFollowup("ses_p3")
  assert.ok(item)
  useChatStore.setState({ running: true, runId: "run_edit", composer: "" } as never)
  dispatchAgentEvent({ type: "run.start", runId: "run_edit", sessionId: "ses_p3" } as never)
  assert.equal(queue.followupPausedReason("ses_p3"), "stopped", "开跑时还是停止")
  dispatchAgentEvent({ type: "run.end", runId: "run_edit", sessionId: "ses_p3" } as never)
  assert.equal(queue.followupPausedReason("ses_p3"), "held")
  useChatStore.setState({ running: false } as never)
  const v = row("ses_p3", zh)
  assert.equal(v.text, "排队的 2 条先不发。")
  assert.deepEqual([v.showContinue, v.showEditFirst], [true, true])
  assert.equal(row("ses_p3", en).text, "2 queued messages are on hold.")
  const one = (t: typeof zh) => view.queuePausedView({ reason: "held", count: 1, composerHasContent: false, pendingFailed: null, provider: named("P"), t: t as never }).text
  assert.equal(one(zh), "排队的 1 条先不发。")
  assert.equal(one(en), "1 queued message is on hold.")
  kick()
  await flush()
  assert.deepEqual(sent, [], "held 也是中性停住，只认继续")
  assert.equal(pause.isNeutralPause("held"), true)
  assert.equal(pause.autoResumesAfterSuccess("held"), false)
  // held 之后又出错 / 额度：不改成琥珀色（与停止同级）。
  queue.pauseFollowups("ses_p3", "quota")
  assert.equal(queue.followupPausedReason("ses_p3"), "held")
})

test("文案红线：新句子不出现 检查点/HEAD/commit/快照/checkpoint/ref；中文带服务商名的走 fillProviderFace", () => {
  const keys = ["queuePausedComposerFirst", "queuePausedResendFirstHeld", "queuePausedComposerFirstHeld", "queuePausedHeld", "queuePausedHeldOne", "queuePausedQuotaComposer", "queuePausedQuotaComposerOne", "credentialFixKeyFirst"]
  for (const cat of [zhChat, enChat]) {
    for (const k of keys) {
      const s = (cat as any)[k]
      assert.equal(typeof s, "string", k)
      assert.doesNotMatch(s, /检查点|HEAD|commit|快照|checkpoint|\bref\b/i, k)
    }
  }
  const zhGeneric = view.queuePausedView({ reason: "quota", count: 2, composerHasContent: true, pendingFailed: "composer", provider: { kind: "generic" }, t: ((k: string, v?: any) => zh(k, v)) as never })
  assert.equal(zhGeneric.text, "模型服务额度用完了，排队的 2 条先不发。充值后先发输入框里这条，发出去后排队的会接着发。")
  const zhLatin = view.queuePausedView({ reason: "quota", count: 2, composerHasContent: true, pendingFailed: "composer", provider: named("DeepSeek"), t: ((k: string, v?: any) => zh(k, v)) as never })
  assert.ok(zhLatin.text.startsWith("DeepSeek 额度用完了"), zhLatin.text)
})
