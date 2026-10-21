/**
 * E1（luna-e1-e2-copy.md E1 段）：停止 / 出错 / 额度用完后排队停住，写明原因；继续 / 改一下再发 / 全部清空（可撤回）；
 * 与 #136 失败卡「再发一次」联动（重发成功后自动接着发）。
 * 真走 abortComposerRun / dispatchAgentEvent / failComposerSend；自启用与 useFollowupAutostart 相同的 kick。
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
const { abortComposerRun } = await import("./composer-run-control.ts")
const { dispatchAgentEvent } = await import("../stores/attention/dispatch-agent-event.ts")
const { failComposerSend } = await import("./runtime-interact/fail-composer-send.ts")
const pause = await import("./followup-pause.ts")
const actions = await import("./runtime-interact/followup-pause-actions.ts")
const view = await import("../components/ai-chat/thread/queue-paused-view.ts")
const storage = await import("../lib/session-draft-storage.ts")
const assets = await import("./composer-assets.ts")
const { zhChat } = await import("../i18n/catalogs/zh/chat.ts")
const { enChat } = await import("../i18n/catalogs/en/chat.ts")
const off = storage.installSessionDraftPersistence()

const sent: string[] = []
/** 与 useFollowupAutostart 的 kick 一样：按当前 store 试一次。 */
function kick(): boolean {
  const store = useChatStore.getState()
  return tryStartNextFollowup({
    sessionId: store.sessionId,
    running: store.running,
    pendingApproval: Boolean(store.pendingApproval),
    // 真发送会立刻把 running 置上（下一条等这一轮跑完）。
    send: async (item) => {
      sent.push(item.prompt)
      useChatStore.setState({ running: true } as never)
    }
  })
}
// 自启订阅在：任何 notify（包括解除暂停）都会 kick。
const unsubscribe = queue.subscribeFollowups(() => void kick())

afterEach(async () => {
  await drainFollowupAutostart()
  queue.resetFollowupsForTest()
  resetFollowupAutostart()
  assets.clearComposerAssets()
  storage.resetPersistedDraftAssetsForTest()
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

function running(sessionId: string, runId = `run_${sessionId}`) {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId,
    composer: "",
    error: null,
    notice: null,
    pendingApproval: null,
    hasKey: true,
    pendingStreamEvents: [],
    messages: [
      { id: "u1", role: "user", content: "先做这个", createdAt: 1 },
      { id: "a1", role: "assistant", content: "做到一半", createdAt: 2, streaming: true }
    ]
  } as never)
}
function enqueue(sessionId: string, ...prompts: string[]) {
  return prompts.map((prompt) => queue.enqueueFollowup({ sessionId, prompt, assets: [] }))
}
const prompts = (sid: string) => queue.listFollowups(sid).map((i) => i.prompt)
const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0))
  await drainFollowupAutostart()
}

test("对照：没停住时一轮跑完，排队的按顺序只发第一条（取项时 notify 重入不再把第二条抢先发出去）", async () => {
  running("ses_ok")
  enqueue("ses_ok", "第一条", "第二条")
  dispatchAgentEvent({ type: "run.end", runId: "run_ses_ok", sessionId: "ses_ok" } as never)
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(sent, ["第一条"])
})

test("停止：abortComposerRun → 记 stopped；running 落下后自启不发；点「继续」按顺序发第一条", async () => {
  running("ses_stop")
  enqueue("ses_stop", "第一条", "第二条")
  await abortComposerRun()
  assert.equal(queue.followupPausedReason("ses_stop"), "stopped")
  assert.equal(useChatStore.getState().running, false)
  assert.equal(kick(), false)
  await flush()
  assert.deepEqual(sent, [], "停住时一条都不发")
  assert.deepEqual(prompts("ses_stop"), ["第一条", "第二条"], "排队项原样不动")
  actions.continueFollowups("ses_stop")
  await flush()
  assert.equal(queue.followupPausedReason("ses_stop"), null)
  assert.deepEqual(sent, ["第一条"], "解除后按顺序先发第一条")
})

test("停止后的暂停不因别的一轮跑完自动解除（只认「继续」）", async () => {
  running("ses_stop2")
  enqueue("ses_stop2", "第一条")
  await abortComposerRun()
  dispatchAgentEvent({ type: "run.end", runId: "run_other", sessionId: "ses_stop2" } as never)
  assert.equal(queue.followupPausedReason("ses_stop2"), "stopped")
})

test("出错（前台 run.error 连不上）→ error；自启不发", async () => {
  running("ses_err")
  enqueue("ses_err", "第一条")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_err", sessionId: "ses_err", message: "provider_unreachable", code: "provider_unreachable" } as never)
  assert.equal(queue.followupPausedReason("ses_err"), "error")
  useChatStore.setState({ running: false } as never)
  assert.equal(kick(), false)
  await flush()
  assert.deepEqual(sent, [])
})

test("额度用完：按错误码（provider_billing / 402 / credit）记 quota；之后通用失败不把 quota 盖成 error", async () => {
  running("ses_quota")
  enqueue("ses_quota", "第一条")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_quota", sessionId: "ses_quota", message: "billing", code: "provider_billing" } as never)
  assert.equal(queue.followupPausedReason("ses_quota"), "quota")
  queue.pauseFollowups("ses_quota", "error")
  assert.equal(queue.followupPausedReason("ses_quota"), "quota")
  assert.equal(pause.followupPauseReasonForFailure("HTTP 402 Payment Required"), "quota")
  assert.equal(pause.followupPauseReasonForFailure("insufficient credits"), "quota")
  assert.equal(pause.followupPauseReasonForFailure("provider_unreachable", "provider_unreachable"), "error")
  assert.equal(pause.followupPauseReasonForFailure("socket hang up"), "error")
})

test("后台会话出错：停车那一份也停住——切回去不自己发", async () => {
  running("ses_fg")
  useChatStore.getState().setRunning(false)
  enqueue("ses_bg", "后台排的")
  dispatchAgentEvent({ type: "run.error", runId: "run_bg", sessionId: "ses_bg", message: "provider_unreachable", code: "provider_unreachable" } as never)
  assert.equal(queue.followupPausedReason("ses_bg"), "error")
  // 切回去：sessionId 换成 ses_bg，running=false —— useFollowupAutostart 会 kick。
  useChatStore.setState({ sessionId: "ses_bg", running: false, runId: null } as never)
  assert.equal(kick(), false)
  await flush()
  assert.deepEqual(sent, [], "切回不自启")
  assert.deepEqual(prompts("ses_bg"), ["后台排的"])
})

test("后台会话停止（用户停止事件）同样停住", async () => {
  useChatStore.setState({ sessionId: "ses_fg2", running: false, runId: null } as never)
  enqueue("ses_bg2", "后台排的")
  dispatchAgentEvent({ type: "run.error", runId: "run_bg2", sessionId: "ses_bg2", message: "aborted by user" } as never)
  assert.equal(queue.followupPausedReason("ses_bg2"), "stopped")
})

test("审批被拒「本次未执行」不是出错：不停", () => {
  useChatStore.setState({ sessionId: "ses_view", running: true } as never)
  enqueue("ses_deny", "第一条")
  for (const code of ["APPROVAL_ARGS_MISMATCH", "APPROVAL_REPLAY_DENIED", "approval_args_missing"]) {
    assert.equal(pause.followupPauseReasonForRunError({ message: code, code }), null)
    dispatchAgentEvent({ type: "run.error", runId: "run_deny", sessionId: "ses_deny", message: code, code } as never)
  }
  dispatchAgentEvent({ type: "run.error", runId: "run_deny", sessionId: "ses_deny", message: "本次未执行。" } as never)
  assert.equal(queue.followupPausedReason("ses_deny"), null)
})

test("标题精炼之类的 completion 出错不算这一会话的一轮：不停", () => {
  enqueue("ses_title", "第一条")
  pause.noteFollowupRunEvent("ses_title", { type: "run.error", message: "provider_unreachable" }, true)
  assert.equal(queue.followupPausedReason("ses_title"), null)
})

test("队列是空的就不记暂停；之后新排的照常自启", async () => {
  running("ses_empty")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_empty", sessionId: "ses_empty", message: "provider_unreachable", code: "provider_unreachable" } as never)
  assert.equal(queue.followupPausedReason("ses_empty"), null)
  useChatStore.setState({ running: false } as never)
  enqueue("ses_empty", "后来排的")
  await flush()
  assert.deepEqual(sent, ["后来排的"])
})

test("出字前发送失败（failComposerSend）→ 停住；额度文案 → quota", () => {
  // 前台在另一个会话：不让测试里的自启把排队项先取走（failComposerSend 走「稿还回发出的会话」分支）。
  useChatStore.setState({ sessionId: "ses_view", running: false, composer: "", messages: [] } as never)
  enqueue("ses_pre", "第一条")
  failComposerSend({ text: "失败那句", reason: "provider_billing", sessionId: "ses_pre" })
  assert.equal(queue.followupPausedReason("ses_pre"), "quota")
  enqueue("ses_pre2", "第一条")
  failComposerSend({ text: "x", reason: "provider_unreachable", sessionId: "ses_pre2" })
  assert.equal(queue.followupPausedReason("ses_pre2"), "error")
})

test("#136 联动：出错停住后，失败卡「再发一次」那一轮跑完（run.end）→ 自动解除，排队的接着按顺序发", async () => {
  running("ses_link")
  enqueue("ses_link", "第一条", "第二条")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_link", sessionId: "ses_link", message: "provider_unreachable", code: "provider_unreachable" } as never)
  useChatStore.setState({ running: false } as never)
  await flush()
  assert.deepEqual(sent, [])
  // 重发那一轮：开跑 → 跑完。
  useChatStore.setState({ running: true, runId: "run_resend" } as never)
  dispatchAgentEvent({ type: "run.start", runId: "run_resend", sessionId: "ses_link" } as never)
  assert.equal(queue.followupPausedReason("ses_link"), "error", "开跑不算成功")
  dispatchAgentEvent({ type: "run.end", runId: "run_resend", sessionId: "ses_link" } as never)
  assert.equal(queue.followupPausedReason("ses_link"), null)
  useChatStore.setState({ running: false } as never)
  kick()
  await flush()
  assert.deepEqual(sent, ["第一条"], "失败那句先发，排队的跟在后面")
})

test("#136 联动：额度停住后重发成功同样自动解除；重发又失败则继续停着", () => {
  running("ses_link2")
  enqueue("ses_link2", "第一条")
  dispatchAgentEvent({ type: "run.error", runId: "r1", sessionId: "ses_link2", message: "billing", code: "provider_billing" } as never)
  dispatchAgentEvent({ type: "run.error", runId: "r2", sessionId: "ses_link2", message: "billing", code: "provider_billing" } as never)
  assert.equal(queue.followupPausedReason("ses_link2"), "quota")
  dispatchAgentEvent({ type: "run.end", runId: "r3", sessionId: "ses_link2" } as never)
  assert.equal(queue.followupPausedReason("ses_link2"), null)
})

test("改一下再发：第一条（字 + 图）进输入框，从队列拿掉，其余仍停着", async () => {
  running("ses_edit")
  const img = { id: "ast_e", name: "e.png", mediaType: "image/png" }
  const [first] = [queue.enqueueFollowup({ sessionId: "ses_edit", prompt: "带图那条", assets: [img] as never })]
  storage.markDraftAssetsQueued("ses_edit", first!.id, "带图那条", [img] as never)
  enqueue("ses_edit", "第二条")
  await abortComposerRun()
  const taken = actions.editFirstFollowup("ses_edit")
  assert.equal(taken?.id, first!.id)
  assert.equal(useChatStore.getState().composer, "带图那条")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_e"])
  assert.deepEqual(prompts("ses_edit"), ["第二条"])
  assert.equal(queue.followupPausedReason("ses_edit"), "stopped", "队列保持暂停")
  assert.equal(((dbAssets.ses_edit ?? []) as any[]).filter((r) => r.queued).length, 0, "排队标记摘掉")
  await flush()
  assert.deepEqual(sent, [])
})

test("全部清空：不确认、一次清掉、排队图标记释放；toast「已清空 N 条排队」5 秒可撤回；撤回后原顺序回来、标记恢复、仍停着", async () => {
  running("ses_clear")
  const img = { id: "ast_c", name: "c.png", mediaType: "image/png" }
  const a = queue.enqueueFollowup({ sessionId: "ses_clear", prompt: "一", assets: [img] as never })
  storage.markDraftAssetsQueued("ses_clear", a.id, "一", [img] as never)
  enqueue("ses_clear", "二", "三")
  enqueue("ses_other", "别的会话")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_clear", sessionId: "ses_clear", message: "billing", code: "provider_billing" } as never)
  useChatStore.setState({ running: false } as never)
  const toasts: Array<{ message: string; opts: any }> = []
  const t = (path: string, vars?: Record<string, string | number>) => {
    const key = path.replace(/^chat\./, "")
    const raw = path === "common.undo" ? "撤销" : String((zhChat as any)[key] ?? path)
    return raw.replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
  }
  view.clearQueuedWithUndo("ses_clear", t, ((message: string, opts: any) => void toasts.push({ message, opts })) as never)
  assert.deepEqual(prompts("ses_clear"), [])
  assert.deepEqual(prompts("ses_other"), ["别的会话"], "别的会话不动")
  assert.equal(queue.followupPausedReason("ses_clear"), null, "空了暂停跟着清")
  assert.equal(((dbAssets.ses_clear ?? []) as any[]).filter((r) => r.queued).length, 0, "图的排队标记释放")
  assert.equal(toasts.length, 1)
  assert.equal(toasts[0]!.message, "已清空 3 条排队")
  assert.equal(toasts[0]!.opts.duration, 5000)
  assert.equal(toasts[0]!.opts.action.label, "撤销")
  toasts[0]!.opts.action.onClick()
  assert.deepEqual(prompts("ses_clear"), ["一", "二", "三"], "原顺序回来")
  assert.equal(queue.followupPausedReason("ses_clear"), "quota", "仍停着，原因不变")
  assert.deepEqual(((dbAssets.ses_clear ?? []) as any[]).filter((r) => r.queued).map((r) => r.queued.itemId), [a.id], "标记恢复")
  await flush()
  assert.deepEqual(sent, [], "撤回后不抢着发")
})

test("全部清空只剩 1 条的 toast 用单数", () => {
  enqueue("ses_one", "唯一")
  queue.pauseFollowups("ses_one", "stopped")
  const msgs: string[] = []
  const tEn = (path: string, vars?: Record<string, string | number>) =>
    String((enChat as any)[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))
  view.clearQueuedWithUndo("ses_one", tEn, ((m: string) => void msgs.push(m)) as never)
  assert.deepEqual(msgs, ["Cleared 1 queued message"])
})

const named = (name: string) => ({ kind: "named" as const, name })
const tr = (cat: Record<string, string>) => (path: string, vars?: Record<string, string | number>) =>
  String(cat[path.replace(/^chat\./, "")] ?? path).replace(/\{(\w+)\}/g, (_m, k) => String(vars?.[k] ?? ""))

test("说明行文案（luna 定稿）：三种原因 × 中英 × N=1 单数；不出现 检查点/HEAD/commit/快照/checkpoint/ref", () => {
  const zh = tr(zhChat as never)
  const en = tr(enChat as never)
  const base = { composerHasContent: false, failureCardRetryShowing: false, provider: named("DeepSeek") }
  const cases = [
    view.queuePausedView({ ...base, reason: "stopped", count: 2, t: zh }).text,
    view.queuePausedView({ ...base, reason: "error", count: 2, t: zh }).text,
    view.queuePausedView({ ...base, reason: "quota", count: 2, t: zh }).text,
    view.queuePausedView({ ...base, reason: "stopped", count: 1, t: en }).text,
    view.queuePausedView({ ...base, reason: "stopped", count: 3, t: en }).text,
    view.queuePausedView({ ...base, reason: "quota", count: 1, t: en }).text
  ]
  assert.match(cases[0]!, /2/)
  assert.match(cases[2]!, /DeepSeek/)
  assert.match(cases[3]!, /1 queued message is/)
  assert.match(cases[4]!, /3 queued messages are/)
  assert.match(cases[5]!, /^DeepSeek .*1 queued message is/)
  for (const text of cases) assert.doesNotMatch(text, /检查点|HEAD|commit|快照|checkpoint|\bref\b|\{/i)
  for (const key of Object.keys(zhChat).filter((k) => k.startsWith("queuePaused"))) {
    assert.doesNotMatch(String((zhChat as any)[key]), /检查点|HEAD|commit|快照/)
    assert.doesNotMatch(String((enChat as any)[key]), /checkpoint|HEAD|commit|\bref\b/i)
  }
})

test("额度句的服务商名和失败卡同源（useSendFailureProviderName → luna P2① 锁定链）：Amp 会话说 Amp；Enjoy 本地说品牌名 → 端点主机名 → 「模型服务」，预设不说密钥档案名、自定义档案说档案名", async () => {
  const { sendFailureProviderName } = await import("../lib/send-failure-provider-name.ts")
  const { defaultProviderFace } = await import("../lib/default-provider-label.ts")
  const { readFileSync } = await import("node:fs")
  const tools = [{ id: "amp", label: "Amp" }]
  const zh = tr(zhChat as never)
  const en = tr(enChat as never)
  const base = { reason: "quota" as const, count: 2, composerHasContent: false, failureCardRetryShowing: false }
  const readiness = { defaultRoute: { runtimeId: "enjoy-local", profileId: "e2e" }, apiKeys: [] } as never
  const local = (row: { name?: string; kind?: string; baseURL?: string } | null) =>
    sendFailureProviderName({
      runtimeId: "enjoy-local",
      tools,
      displayNames: {},
      provider: defaultProviderFace(readiness, row ? [{ id: "e2e", active: true, hasKey: true, ...row }] : [])
    })
  const amp = sendFailureProviderName({ runtimeId: "amp", tools, displayNames: {}, provider: named("DeepSeek") })
  assert.equal(view.queuePausedView({ ...base, provider: amp, t: zh }).text, "Amp 额度用完了，排队的 2 条先不发。充值后点继续。")
  // 预设品牌名（档案名叫 E2E Stub Key 也不说）。
  const preset = view.queuePausedView({ ...base, provider: local({ name: "E2E Stub Key", kind: "deepseek" }), t: zh }).text
  assert.equal(preset, "DeepSeek 额度用完了，排队的 2 条先不发。充值后点继续。")
  // 自定义档案（luna #164 第 3 轮）：说档案名（去空白、按 placeProviderName 排空格）；名字空才说主机名（不带协议 / 路径），超 30 字截断加「…」。
  assert.equal(view.queuePausedView({ ...base, provider: local({ name: " 我的网关 ", kind: "custom", baseURL: "https://llm.example.com/v1" }), t: zh }).text, "我的网关额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(view.queuePausedView({ ...base, provider: local({ name: "My Relay", kind: "custom", baseURL: "https://llm.example.com/v1" }), t: zh }).text, "My Relay 额度用完了，排队的 2 条先不发。充值后点继续。")
  const host = view.queuePausedView({ ...base, provider: local({ name: "", kind: "custom", baseURL: "https://llm.example.com:8443/v1?key=x" }), t: en }).text
  assert.equal(host, "llm.example.com is out of credit, so 2 queued messages are on hold. Top up, then press Continue.")
  const long = view.queuePausedView({ ...base, provider: local({ name: "  ", kind: "custom", baseURL: "https://a-very-long-subdomain.inference.example.org/v1" }), t: zh }).text
  assert.match(long, /^a-very-long-subdomain\.inferen… 额度用完了/)
  // 都没有 → 「模型服务」；英文句首大写。
  assert.equal(view.queuePausedView({ ...base, provider: local(null), t: zh }).text, "模型服务额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(view.queuePausedView({ ...base, count: 1, provider: local({ name: "E2E Stub Key" }), t: en }).text, "The model service is out of credit, so 1 queued message is on hold. Top up, then press Continue.")
  for (const text of [preset, host, long]) assert.doesNotMatch(text, /E2E Stub Key|https?:|\/v1|deepseek\b|custom/)
  const row = readFileSync(new URL("../components/ai-chat/thread/queue-paused-row.tsx", import.meta.url), "utf8").replace(/\/\/.*$/gm, "")
  assert.match(row, /const provider = useSendFailureProviderName\(\)/)
  assert.ok(!/defaultProviderLabel|credentialProviderFallback/.test(row), "说明行不再自己拿密钥档案名")
  assert.equal((zhChat as any).credentialProviderFallback, undefined, "「当前供应商」已删（P2②）")
  assert.equal((enChat as any).credentialProviderFallback, undefined)
  assert.equal((zhChat as any).credentialProviderGeneric, "模型服务")
  assert.equal((enChat as any).credentialProviderGeneric, "the model service")
})

test("按钮显隐：默认三个都在；输入框有内容 → 「改一下再发」隐藏（不是置灰）；停止时失败卡不影响", () => {
  const t = tr(zhChat as never)
  const base = { reason: "error" as const, count: 2, provider: named("P"), t }
  assert.deepEqual(
    pick(view.queuePausedView({ ...base, composerHasContent: false, failureCardRetryShowing: false })),
    { showContinue: true, showEditFirst: true }
  )
  assert.deepEqual(
    pick(view.queuePausedView({ ...base, composerHasContent: true, failureCardRetryShowing: false })),
    { showContinue: true, showEditFirst: false }
  )
  assert.deepEqual(
    pick(view.queuePausedView({ ...base, reason: "stopped", composerHasContent: false, failureCardRetryShowing: true })),
    { showContinue: true, showEditFirst: true }
  )
})

test("#136 联动显隐：出错 / 额度且失败卡露着「再发一次」→ 继续、改一下再发都隐藏；出错句尾接「先发上面这条…」；额度整句换成「充值后先发上面这条…」（P2③）", () => {
  const zh = tr(zhChat as never)
  const en = tr(enChat as never)
  const zhError = view.queuePausedView({ reason: "error", count: 2, composerHasContent: false, failureCardRetryShowing: true, provider: named("P"), t: zh })
  assert.deepEqual(pick(zhError), { showContinue: false, showEditFirst: false })
  assert.equal(zhError.text, "上一条没发出去，排队的 2 条先不发，免得顺序乱。先发上面这条，发出去后排队的会接着发。")
  const enError = view.queuePausedView({ reason: "error", count: 2, composerHasContent: false, failureCardRetryShowing: true, provider: named("P"), t: en })
  assert.ok(enError.text.endsWith(` ${(enChat as any).queuePausedResendFirst}`), enError.text)
  assert.doesNotMatch(enError.text, /\. {2}/)
  const quota = (count: number, t: typeof zh, retry: boolean, provider: ReturnType<typeof named> | { kind: "generic" } = named("OpenAI")) =>
    view.queuePausedView({ reason: "quota", count, composerHasContent: false, failureCardRetryShowing: retry, provider, t })
  assert.deepEqual(pick(quota(2, zh, true)), { showContinue: false, showEditFirst: false })
  assert.equal(quota(2, zh, true).text, "OpenAI 额度用完了，排队的 2 条先不发。充值后先发上面这条，发出去后排队的会接着发。")
  assert.equal(quota(1, zh, true).text, "OpenAI 额度用完了，排队的 1 条先不发。充值后先发上面这条，发出去后排队的会接着发。")
  assert.equal(quota(3, en, true).text, "OpenAI is out of credit, so 3 queued messages are on hold. Top up, then send the one above. The queue continues after it goes through.")
  assert.equal(quota(1, en, true).text, "OpenAI is out of credit, so 1 queued message is on hold. Top up, then send the one above. The queue continues after it goes through.")
  assert.equal(quota(2, en, true, { kind: "generic" }).text.slice(0, 33), "The model service is out of credi")
  // 「继续」藏着时不许叫人「点继续」。
  for (const t of [zh, en]) for (const n of [1, 2]) assert.doesNotMatch(quota(n, t, true).text, /点继续|press Continue/)
  // 失败卡收掉后（「继续」又出来）：句尾回到「充值后点继续。」
  assert.deepEqual(pick(quota(2, zh, false)), { showContinue: true, showEditFirst: true })
  assert.equal(quota(2, zh, false).text, "OpenAI 额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(quota(2, en, false).text, "OpenAI is out of credit, so 2 queued messages are on hold. Top up, then press Continue.")
})

function pick(v: { showContinue: boolean; showEditFirst: boolean }) {
  return { showContinue: v.showContinue, showEditFirst: v.showEditFirst }
}

test("接线：说明行在排队区顶部（同一容器）；停止灰色、出错 / 额度琥珀色；≤600 高折叠成「已暂停 · 排队 N 条」；按钮顺序 清空 · 改一下 · 继续（主按钮）", async () => {
  const { readFileSync } = await import("node:fs")
  const row = readFileSync(new URL("../components/ai-chat/thread/queue-paused-row.tsx", import.meta.url), "utf8")
  const dock = readFileSync(new URL("../components/ai-chat/thread/queued-followups.tsx", import.meta.url), "utf8")
  const idx = (s: string) => row.indexOf(s)
  assert.ok(idx("queue-paused-clear") < idx("queue-paused-edit-first") && idx("queue-paused-edit-first") < idx("queue-paused-continue"))
  // leo soft：颜色断言锚在说明文字那个 <p> 上（图标、文字各自都要分色）。
  assert.match(row, /data-testid="queue-paused-reason"[\s\S]{0,160}isNeutralPause\(reason\) \? QUEUE_MUTED_TEXT : "text-status-yellow-text"/)
  assert.match(row, /isNeutralPause\(reason\) \? "text-text-tertiary" : "text-status-yellow-text"/)
  assert.match(dock, /<QueuePausedRow/)
  assert.match(dock, /queue-paused-collapsed/)
  assert.equal(zhChat.queuePausedCollapsed, "已暂停 · 排队 {n} 条")
  assert.equal(zhChat.queuePausedClearAll, "全部清空")
  assert.equal(zhChat.queuePausedEditFirst, "改一下再发")
  assert.equal(zhChat.queuePausedContinue, "继续")
})

// ---- luna 定稿补充：运行中换了助手（engine handoff 停了上一轮）----
const { confirmEngineHandoff, useEngineHandoffStore } = await import("../components/ai-chat/agent-picker/handoff/engine-handoff-store.ts")

function pendingHandoff() {
  useEngineHandoffStore.setState({ phase: "handoff_pending", fromRuntimeId: "claude", toRuntimeId: "amp", draftSummary: "", filePaths: [], banner: null, pendingPreset: null } as never)
}

test("换助手（真走 confirmEngineHandoff）：运行中有排队 → engineSwitched；被停那一轮的「用户停止」回来不改回 stopped；一轮跑完不自动解除；点继续才发", async () => {
  running("ses_switch")
  enqueue("ses_switch", "第一条", "第二条")
  pendingHandoff()
  assert.equal(await confirmEngineHandoff(), true)
  assert.equal(queue.followupPausedReason("ses_switch"), "engineSwitched")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_switch", sessionId: "ses_switch", message: "aborted by user" } as never)
  assert.equal(queue.followupPausedReason("ses_switch"), "engineSwitched")
  dispatchAgentEvent({ type: "run.end", runId: "run_other", sessionId: "ses_switch" } as never)
  assert.equal(queue.followupPausedReason("ses_switch"), "engineSwitched")
  useChatStore.setState({ running: false } as never)
  await flush()
  assert.deepEqual(sent, [])
  actions.continueFollowups("ses_switch")
  await flush()
  assert.deepEqual(sent, ["第一条"])
})

test("换助手时这一轮没在跑（队列已因出错停着）→ 原因保留 error，不改成「你换了助手」", async () => {
  running("ses_switch2")
  enqueue("ses_switch2", "第一条")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_switch2", sessionId: "ses_switch2", message: "provider_unreachable", code: "provider_unreachable" } as never)
  useChatStore.setState({ running: false } as never)
  pendingHandoff()
  await confirmEngineHandoff()
  assert.equal(queue.followupPausedReason("ses_switch2"), "error")
})

test("用户点停止仍是 stopped（换助手的原因不外溢）；之后再记 engineSwitched 会覆盖 stopped", async () => {
  running("ses_switch3")
  enqueue("ses_switch3", "第一条")
  await abortComposerRun()
  assert.equal(queue.followupPausedReason("ses_switch3"), "stopped")
  queue.pauseFollowups("ses_switch3", "engineSwitched")
  assert.equal(queue.followupPausedReason("ses_switch3"), "engineSwitched")
})

test("换助手文案（luna 定稿）：中英、N=1 单数、灰色中性、不接「先发上面这条」；占位符与停止一致", () => {
  const zh = tr(zhChat as never)
  const en = tr(enChat as never)
  const base = { reason: "engineSwitched" as const, composerHasContent: false, failureCardRetryShowing: true, provider: named("P") }
  const zh2 = view.queuePausedView({ ...base, count: 2, t: zh })
  assert.equal(zh2.text, "你换了助手，上一轮停了，排队的 2 条先不发。")
  assert.deepEqual(pick(zh2), { showContinue: true, showEditFirst: true })
  assert.equal(view.queuePausedView({ ...base, count: 3, t: en }).text, "You switched assistants, so the last turn stopped and 3 queued messages are on hold.")
  assert.equal(view.queuePausedView({ ...base, count: 1, t: en }).text, "You switched assistants, so the last turn stopped and 1 queued message is on hold.")
  assert.equal(view.queuePausedView({ ...base, count: 1, t: zh }).text, "你换了助手，上一轮停了，排队的 1 条先不发。")
  assert.equal(pause.isNeutralPause("engineSwitched"), true)
  assert.equal(pause.isNeutralPause("stopped"), true)
  assert.equal(pause.isNeutralPause("error"), false)
  assert.equal(pause.autoResumesAfterSuccess("engineSwitched"), false)
  const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",")
  for (const cat of [zhChat, enChat] as any[]) {
    assert.equal(holes(cat.queuePausedEngineSwitched), holes(cat.queuePausedStopped))
    assert.equal(holes(cat.queuePausedEngineSwitchedOne), holes(cat.queuePausedStoppedOne))
  }
})

// ---- leo BLOCK #163（2ce6eda5）五条 must ----
const { emptySessionToDiscardOnLeave, discardEmptySessionOnLeave } = await import("./discard-empty-on-leave.ts")
const { leaveStateSnapshot } = await import("./leave-state-snapshot.ts")
const { restoreComposerAfterFailedSend, SEND_FAILED_RESTORE } = await import("./queue-composer-send.ts")
const { continueTodoTurn } = await import("./continue-todo-turn.ts")
const { regenerateUserTurn } = await import("./regenerate-turn.ts")
const writeback = await import("./composer-writeback.ts")
const followupActions = await import("./runtime-interact/followup-actions.ts")
const { sendComposerMessage } = await import("./runtime-interact/send-composer-run.ts")
const { editAndResendUserTurn } = await import("./regenerate-turn.ts")
const syncLock = await import("./composer-sync-lock.ts")
const { discardCreatedSession } = await import("./discard-created-session.ts")
const { readFileSync: readFs } = await import("node:fs")
const readSource = (rel: string) => readFs(new URL(rel, import.meta.url), "utf8")

function emptySession(sessionId: string) {
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: false, runId: null, composer: "", messages: [], error: null,
    notice: null, pendingApproval: null, preparingHint: false, preparingSessionId: null
  } as never)
}
/** 排队时前台在别的会话（不让测试里的自启先把它取走），再切到这个空会话。 */
function queuedThenEmpty(sessionId: string, ...items: string[]) {
  useChatStore.setState({ sessionId: "ses_view", running: true } as never)
  enqueue(sessionId, ...items)
  emptySession(sessionId)
}
/** 假输入框：DOM 里是 domText，store 落后（回写锁期间的样子）。 */
function fakeComposerDom(domText: string) {
  const el = { value: domText, getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
  return el
}

test("① 首字前失败回滚成空会话、但还有排队的 → 离开不删会话（P7）；排队清空后才删", async () => {
  queuedThenEmpty("ses_leave", "排队的字")
  const snap = leaveStateSnapshot()
  assert.equal(snap.queuedFollowups, true)
  assert.equal(emptySessionToDiscardOnLeave(snap, "ses_next"), null, "快照带上排队")
  assert.equal(emptySessionToDiscardOnLeave({ ...snap, queuedFollowups: false }, "ses_next"), null, "快照漏了也再查一次队列")
  discardEmptySessionOnLeave(snap, "ses_next", () => "ses_next")
  await flush()
  assert.ok(!ideCalls.includes(".session.delete"), "没调 session.delete")
  assert.deepEqual(prompts("ses_leave"), ["排队的字"], "用户打的字还在")
  queue.takeAllFollowups("ses_leave")
  assert.equal(emptySessionToDiscardOnLeave(leaveStateSnapshot(), "ses_next"), "ses_leave", "对照：真空了照删")
})

test("② 停止后被停那一轮又报非用户停止的出错 / 额度，再来 run.end → 仍是 stopped、不自动发（P6）", async () => {
  running("ses_p6")
  enqueue("ses_p6", "一", "二")
  await abortComposerRun()
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_p6", sessionId: "ses_p6", message: "provider_unreachable", code: "provider_unreachable" } as never)
  assert.equal(queue.followupPausedReason("ses_p6"), "stopped")
  dispatchAgentEvent({ type: "run.error", runId: "run_ses_p6", sessionId: "ses_p6", message: "billing", code: "provider_billing" } as never)
  assert.equal(queue.followupPausedReason("ses_p6"), "stopped")
  failComposerSend({ text: "x", reason: "provider_unreachable", sessionId: "ses_p6" })
  assert.equal(queue.followupPausedReason("ses_p6"), "stopped")
  dispatchAgentEvent({ type: "run.end", runId: "run_ses_p6", sessionId: "ses_p6" } as never)
  assert.equal(queue.followupPausedReason("ses_p6"), "stopped", "run.end 不放开")
  useChatStore.setState({ running: false, runId: null } as never)
  kick()
  await flush()
  assert.deepEqual(sent, [], "一条都不自己发")
})

test("② 换助手同样不被之后的出错 / 额度改写", async () => {
  running("ses_p6b")
  enqueue("ses_p6b", "一")
  await abortComposerRun({ pauseReason: "engineSwitched" })
  queue.pauseFollowups("ses_p6b", "error")
  queue.pauseFollowups("ses_p6b", "quota")
  dispatchAgentEvent({ type: "run.end", runId: "run_x", sessionId: "ses_p6b" } as never)
  assert.equal(queue.followupPausedReason("ses_p6b"), "engineSwitched")
})

test("③ 发送看门狗失败（restoreComposerAfterFailedSend）→ 先停住排队：B 不抢在退回输入框的 A 前面发出去", async () => {
  running("ses_wd")
  useChatStore.setState({ messages: [], runId: null } as never)
  enqueue("ses_wd", "B")
  restoreComposerAfterFailedSend("A", SEND_FAILED_RESTORE)
  assert.equal(useChatStore.getState().running, false)
  assert.equal(queue.followupPausedReason("ses_wd"), "error")
  assert.equal(kick(), false)
  await flush()
  assert.deepEqual(sent, [], "B 没发")
  assert.equal(useChatStore.getState().composer, "A", "A 回到输入框")
  assert.deepEqual(prompts("ses_wd"), ["B"])
})

test("③ 继续 Todo 起跑抛错 → 停住排队，不自动发", async () => {
  queuedThenEmpty("ses_todo", "排队的")
  useChatStore.setState({ runtimeId: "claude", messages: [{ id: "u1", role: "user", content: "做事", createdAt: 1 }] } as never)
  throwOn.add(".agent.run")
  await continueTodoTurn()
  assert.equal(useChatStore.getState().running, false)
  assert.equal(queue.followupPausedReason("ses_todo"), "error")
  kick()
  await flush()
  assert.deepEqual(sent, [])
})

test("③ 重新生成起跑抛错 → 停住排队，不自动发", async () => {
  queuedThenEmpty("ses_regen", "排队的")
  useChatStore.setState({
    runtimeId: "claude",
    messages: [
      { id: "u1", role: "user", content: "问题", createdAt: 1 },
      { id: "a1", role: "assistant", content: "旧答", createdAt: 2 }
    ]
  } as never)
  throwOn.add(".agent.run")
  await regenerateUserTurn("u1")
  assert.equal(useChatStore.getState().running, false)
  assert.equal(queue.followupPausedReason("ses_regen"), "error")
  kick()
  await flush()
  assert.deepEqual(sent, [])
})

test("③ 闸拦发送（restoreDraftAfterSendGate，SSH 未连上）→ 先停住排队：B 不抢在退回输入框的 A 前面发出去（V3b）", async () => {
  queuedThenEmpty("ses_gate", "B")
  useChatStore.setState({ workspaceKind: "ssh", remoteStatus: "disconnected", runtimeId: "claude" } as never)
  fakeComposerDom("A")
  try {
    await sendComposerMessage(undefined, "A")
    assert.equal(useChatStore.getState().running, false)
    assert.ok(useChatStore.getState().error, "闸拦的中性条在")
    assert.equal(queue.followupPausedReason("ses_gate"), "error")
    assert.equal(kick(), false)
    await flush()
    assert.deepEqual(sent, [], "B 没发")
    assert.equal(useChatStore.getState().composer, "A", "A 回到输入框")
    assert.deepEqual(prompts("ses_gate"), ["B"])
  } finally {
    useChatStore.setState({ workspaceKind: "local", remoteStatus: null } as never)
  }
})

test("③ 编辑重发起跑抛错（editAndResendUserTurn）→ 停住排队，不自动发（V3d）", async () => {
  queuedThenEmpty("ses_edit", "排队的")
  useChatStore.setState({
    runtimeId: "claude",
    messages: [
      { id: "u1", role: "user", content: "问题", createdAt: 1 },
      { id: "a1", role: "assistant", content: "旧答", createdAt: 2 }
    ]
  } as never)
  throwOn.add(".agent.run")
  await editAndResendUserTurn("u1", "改过的问题")
  assert.equal(useChatStore.getState().running, false)
  assert.equal(queue.followupPausedReason("ses_edit"), "error")
  kick()
  await flush()
  assert.deepEqual(sent, [])
})

test("leo soft：还稿时停住的是发出这一发的会话，不是此刻的前台", () => {
  useChatStore.setState({ sessionId: "ses_fg", running: true, composer: "" } as never)
  enqueue("ses_from", "从那边排的")
  enqueue("ses_fg", "前台排的")
  restoreComposerAfterFailedSend("A", SEND_FAILED_RESTORE, undefined, "ses_from")
  assert.equal(queue.followupPausedReason("ses_from"), "error")
  assert.equal(queue.followupPausedReason("ses_fg"), null, "前台会话不被误停")
})

test("leo soft（源码正则）：看门狗 / 会话对不上两处还稿都带上发出时的会话", () => {
  const src = readSource("./runtime-interact/send-composer-run.ts")
  assert.match(src, /restoreComposerAfterFailedSend\(text, SEND_FAILED_RESTORE, undefined, before\.sessionId \?\? state\.sessionId\)/)
  assert.match(src, /restoreComposerAfterFailedSend\(prepared\.content, SEND_FAILED_RESTORE, prepared\.assets, prepared\.sessionId\)/)
})

test("leo soft：新建会话还有排队的 → discardCreatedSession 不删（看门狗清会话 / 失败回滚同一入口）；清空后才删", async () => {
  useChatStore.setState({ sessionId: "ses_view", running: true } as never)
  enqueue("ses_new", "排队的")
  emptySession("ses_new")
  assert.equal(await discardCreatedSession("ses_new", () => true, { keepComposer: true, onlyIfEmpty: true }), false)
  assert.equal(useChatStore.getState().sessionId, "ses_new", "前台没被清")
  assert.ok(!ideCalls.includes(".session.delete"), "没调删除")
  queue.resetFollowupsForTest()
  assert.equal(await discardCreatedSession("ses_new", () => true, { keepComposer: true, onlyIfEmpty: true }), true)
  assert.ok(ideCalls.includes(".session.delete"))
})

test("写回 expectSessionId：前台已换会话（中间有 await，#159 F1）→ 不写、返回 session-changed；refuse 与 merge 都一样", () => {
  useChatStore.setState({ sessionId: "ses_now", composer: "" } as never)
  const el = fakeComposerDom("")
  for (const mode of ["refuse", "merge"] as const) {
    const r = writeback.writeBackToComposer({ text: "旧会话的稿" }, { mode, expectSessionId: "ses_before", focus: false })
    assert.deepEqual(r, { ok: false, reason: "session-changed", current: "" })
    assert.equal(writeback.canWriteBackToComposer(mode, { expectSessionId: "ses_before" }), false)
  }
  assert.equal(el.value, "")
  assert.equal(useChatStore.getState().composer, "")
  const ok = writeback.writeBackToComposer({ text: "本会话的稿" }, { mode: "refuse", expectSessionId: "ses_now", focus: false })
  assert.deepEqual(ok, { ok: true, merged: false, text: "本会话的稿" })
})

test("排队行「退回输入框」：前台不是这条所属的会话 → 不写、这条留在队里", () => {
  useChatStore.setState({ sessionId: "ses_other", running: true, composer: "" } as never)
  const [item] = enqueue("ses_mine", "排队那条")
  const el = fakeComposerDom("")
  assert.equal(followupActions.returnFollowupToComposer(item!), false)
  assert.equal(el.value, "")
  assert.deepEqual(prompts("ses_mine"), ["排队那条"])
})

test("leo soft：merge 也守回写锁——锁住时不写（refuse 同样），排队项原封不动；放锁后照常合并", () => {
  useChatStore.setState({ sessionId: "ses_lock", running: true, composer: "" } as never)
  const [item] = enqueue("ses_lock", "排队那条")
  const el = fakeComposerDom("我刚打的")
  syncLock.setComposerWritebackHeld(true)
  try {
    const r = writeback.writeBackToComposer({ text: "排队那条" }, { mode: "merge", focus: false })
    assert.deepEqual(r, { ok: false, reason: "writeback-held", current: "我刚打的" })
    assert.equal(writeback.canWriteBackToComposer("merge"), false)
    assert.equal(writeback.canWriteBackToComposer("refuse"), false)
    assert.equal(followupActions.returnFollowupToComposer(item!), false)
    assert.equal(el.value, "我刚打的", "DOM 没被改")
    assert.deepEqual(prompts("ses_lock"), ["排队那条"], "排队项原封不动")
  } finally {
    syncLock.setComposerWritebackHeld(false)
  }
  assert.equal(followupActions.returnFollowupToComposer(item!), true)
  assert.equal(el.value, "我刚打的\n排队那条")
})

test("④ 改一下再发：输入框 DOM 里已有字、store 落后（回写锁）→ 不覆盖，第一条留在队里仍暂停（P5）", async () => {
  running("ses_p5")
  enqueue("ses_p5", "排队那条", "第二条")
  await abortComposerRun()
  const el = fakeComposerDom("我刚打的")
  assert.equal(useChatStore.getState().composer, "", "store 落后")
  assert.equal(actions.editFirstFollowup("ses_p5"), null)
  assert.equal(el.value, "我刚打的")
  assert.equal(useChatStore.getState().composer, "")
  assert.deepEqual(prompts("ses_p5"), ["排队那条", "第二条"], "排队项原封不动")
  assert.equal(queue.followupPausedReason("ses_p5"), "stopped")
})

test("④ 排队行「退回输入框」：DOM 里已有字 → 合并（现有在前），不冲掉", () => {
  useChatStore.setState({ sessionId: "ses_ret", running: true, composer: "" } as never)
  const [item] = enqueue("ses_ret", "排队那条")
  const el = fakeComposerDom("我刚打的")
  assert.equal(followupActions.returnFollowupToComposer(item!), true)
  assert.equal(el.value, "我刚打的\n排队那条")
  assert.equal(useChatStore.getState().composer, "我刚打的\n排队那条")
  assert.deepEqual(prompts("ses_ret"), [])
})

test("④ 共享工具 writeBackToComposer：refuse / merge / 空框直接写 / 图按 id 去重", () => {
  useChatStore.setState({ composer: "" } as never)
  fakeComposerDom("")
  const img = { id: "ast_w", name: "w.png", mediaType: "image/png" }
  assert.deepEqual(writeback.writeBackToComposer({ text: "回来的", assets: [img] }, { mode: "refuse", focus: false }), { ok: true, merged: false, text: "回来的" })
  assert.equal(writeback.canWriteBackToComposer("refuse"), false, "有字有图就不能 refuse 写")
  const refused = writeback.writeBackToComposer({ text: "再来" }, { mode: "refuse" })
  assert.deepEqual(refused, { ok: false, reason: "composer-has-content", current: "回来的" })
  const merged = writeback.writeBackToComposer({ text: "再来", assets: [img] }, { mode: "merge", focus: false })
  assert.deepEqual(merged, { ok: true, merged: true, text: "回来的\n再来" })
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), ["ast_w"], "同一张图不重复")
  // 只有图没有字也算有内容
  useChatStore.setState({ composer: "" } as never)
  fakeComposerDom("  ")
  assert.equal(writeback.composerHasLiveContent(), true)
})

test("⑤ 按会话隔离：A 停住时 B 照常自启；A 点继续不动 B 的暂停", async () => {
  running("ses_A")
  enqueue("ses_A", "A1")
  await abortComposerRun()
  assert.equal(queue.followupPausedReason("ses_A"), "stopped")
  // 切到 B：B 没停，一轮跑完 → 自启发 B1。
  running("ses_B")
  enqueue("ses_B", "B1", "B2")
  assert.equal(queue.followupPausedReason("ses_B"), null, "A 的暂停不外溢到 B")
  dispatchAgentEvent({ type: "run.end", runId: "run_ses_B", sessionId: "ses_B" } as never)
  useChatStore.setState({ running: false, runId: null } as never)
  kick()
  await flush()
  assert.deepEqual(sent, ["B1"], "B 照常自启")
  assert.deepEqual(prompts("ses_A"), ["A1"], "A 一条没动")
  // B 也停住（出错），A 点继续：只解 A。
  queue.pauseFollowups("ses_B", "error")
  actions.continueFollowups("ses_A")
  assert.equal(queue.followupPausedReason("ses_A"), null)
  assert.equal(queue.followupPausedReason("ses_B"), "error", "B 仍停着")
  await flush()
  assert.deepEqual(sent, ["B1"], "前台 B 停着，没多发")
})

test("撤回连点两下不重复（M4c）", () => {
  running("ses_undo2")
  enqueue("ses_undo2", "一", "二")
  queue.pauseFollowups("ses_undo2", "stopped")
  const cleared = actions.clearAllFollowups("ses_undo2")!
  actions.undoClearFollowups(cleared)
  actions.undoClearFollowups(cleared)
  assert.deepEqual(prompts("ses_undo2"), ["一", "二"])
})

test("pausedCollapsed：只有窗口矮且没点开时折叠", () => {
  assert.equal(view.pausedCollapsed(true, false), true)
  assert.equal(view.pausedCollapsed(true, true), false)
  assert.equal(view.pausedCollapsed(false, false), false)
  assert.equal(view.pausedCollapsed(false, true), false)
})

// ---- luna #163 真机门 P2⑤：换助手落在起跑窗口（排队那条刚开始发、还没出字）----
function idleAfterRun(sessionId: string) {
  running(sessionId)
  // 上一轮已收尾：running / runId 都放下，末尾助手轮已定稿。
  useChatStore.setState({
    running: false,
    runId: null,
    preparingHint: false,
    preparingSessionId: null,
    messages: [
      { id: "u1", role: "user", content: "先做这个", createdAt: 1 },
      { id: "a1", role: "assistant", content: "做完了", createdAt: 2, streaming: false }
    ]
  } as never)
}

test("P2⑤ 换助手落在自启起跑窗口（send 没返回、running 被上一轮迟到收尾放下）→ engineSwitched 灰色；作废那一发报出错也不改；手动发一条跑完，其余不自动发给新助手", async () => {
  running("ses_sw4")
  enqueue("ses_sw4", "s1", "s2")
  idleAfterRun("ses_sw4")
  let finishSend!: () => void
  const started = tryStartNextFollowup({
    sessionId: "ses_sw4",
    running: false,
    send: (item) => {
      sent.push(item.prompt)
      // 起跑窗口：running 先占上，又被上一轮迟到的收尾放下；runId 还没认领、还没出字。
      useChatStore.setState({ running: false, runId: null } as never)
      return new Promise<void>((resolve) => (finishSend = resolve))
    }
  })
  assert.equal(started, true)
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(sent, ["s1"])
  assert.equal(useChatStore.getState().running, false)
  pendingHandoff()
  assert.equal(await confirmEngineHandoff(), true)
  assert.equal(queue.followupPausedReason("ses_sw4"), "engineSwitched")
  // agent.run 回执迟到 → 认领不到（孤儿）→ failComposerSend 报通用失败：不把灰色改成琥珀色。
  failComposerSend({ text: "s1", reason: SEND_FAILED_RESTORE, sessionId: "ses_sw4" })
  assert.equal(queue.followupPausedReason("ses_sw4"), "engineSwitched")
  finishSend()
  await flush()
  const zh = tr(zhChat as never)
  const v = view.queuePausedView({ reason: queue.followupPausedReason("ses_sw4")!, count: 1, composerHasContent: true, failureCardRetryShowing: true, provider: { kind: "generic" }, t: zh })
  assert.equal(v.text, "你换了助手，上一轮停了，排队的 1 条先不发。")
  assert.equal(pause.isNeutralPause(queue.followupPausedReason("ses_sw4")), true)
  // 用户手动把 s1 发出去并跑完（run.end）：engineSwitched 不自动解除，s2 不自己发。
  dispatchAgentEvent({ type: "run.end", runId: "run_manual_s1", sessionId: "ses_sw4" } as never)
  useChatStore.setState({ running: false, runId: null } as never)
  await flush()
  assert.equal(queue.followupPausedReason("ses_sw4"), "engineSwitched")
  assert.deepEqual(sent, ["s1"])
  assert.deepEqual(prompts("ses_sw4"), ["s2"])
})

test("P2⑤ 换助手落在手动发送的首字前（末尾挂着没字的乐观助手轮，runId 还没认领）→ engineSwitched", async () => {
  running("ses_sw5")
  enqueue("ses_sw5", "s2")
  useChatStore.setState({
    running: false,
    runId: null,
    messages: [
      { id: "u1", role: "user", content: "s1", createdAt: 1 },
      { id: "msg_pending_1", role: "assistant", content: "", createdAt: 2, streaming: true, reasoning: "", tools: [] }
    ]
  } as never)
  pendingHandoff()
  assert.equal(await confirmEngineHandoff(), true)
  assert.equal(queue.followupPausedReason("ses_sw5"), "engineSwitched")
})

test("P2⑤ 换助手落在本会话「正在准备…」（首发 agent.run 还没回）→ engineSwitched；别的会话的「正在准备…」不算", async () => {
  running("ses_sw6")
  enqueue("ses_sw6", "s2")
  queue.pauseFollowups("ses_sw6", "error")
  idleAfterRun("ses_sw6")
  useChatStore.setState({ preparingHint: true, preparingSessionId: "ses_other" } as never)
  pendingHandoff()
  await confirmEngineHandoff()
  assert.equal(queue.followupPausedReason("ses_sw6"), "error", "别的会话在准备：这一轮不算在跑，保留 error")
  useChatStore.setState({ preparingHint: true, preparingSessionId: "ses_sw6" } as never)
  pendingHandoff()
  await confirmEngineHandoff()
  // error 被用户自己的 engineSwitched 覆盖（起跑窗口里换助手）。
  assert.equal(queue.followupPausedReason("ses_sw6"), "engineSwitched")
  useChatStore.setState({ preparingHint: false, preparingSessionId: null } as never)
})

// ---- luna #163 真机门 P3a：审批卡在、队列停着 → 排队行标签说「已暂停」，不说「排队中」----
test("P3a 排队行标签：停着说「已暂停 / Paused」，没停「排队中 / Queued」；审批卡在时说明行让位，但标签仍按停着画", () => {
  assert.equal(view.queuedRowLabelKey(true), "chat.queuePausedLabel")
  assert.equal(view.queuedRowLabelKey(false), "chat.runtimeQueuedBubble")
  assert.equal((zhChat as any).queuePausedLabel, "已暂停")
  assert.equal((enChat as any).queuePausedLabel, "Paused")
  assert.equal((zhChat as any).runtimeQueuedBubble, "排队中")
  const dock = readSource("../components/ai-chat/thread/queued-followups.tsx").replace(/\/\/.*$/gm, "")
  // 说明行仍让位给审批（approvalPending ? null : paused），但 queuePaused 不看审批。
  assert.match(dock, /paused=\{approvalPending \? null : paused\} queuePaused=\{paused != null\}/)
  assert.match(dock, /compact\s+paused=\{queuePaused\}/)
  const turn = readSource("../components/ai-chat/thread/turns/queued-user-turn.tsx")
  assert.match(turn, /const label = t\(queuedRowLabelKey\(paused\)\)/)
  assert.equal((turn.match(/\{label\}/g) ?? []).length, 2, "紧凑行和时间线泡两处标签都走 label")
  assert.ok(!/t\("chat\.runtimeQueuedBubble"\)/.test(turn), "不再写死「排队中」")
})

// ---- luna #163 真机门 P2④：对比度 ≥ 4.5:1（亮 / 暗）----
test("P2④ 对比度：说明行灰字 / 次按钮 / 紧凑行标签用 neutral-600（亮）/ neutral-400（暗），时间线泡标签亮色 neutral-700，「继续」走 bg-cta（默认 accent-700 白字，悬停 800）；全部 ≥ 4.5", () => {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lum = (h: string) => {
    const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi! + 0.05) / (lo! + 0.05)
  }
  // packages/ui/styles/theme.css + tailwind v4 色板（oklch 换算成 sRGB）：
  // bg-background-secondary-default 亮 neutral-100 #f7f7f7 / 暗 neutral-900 #171717；accent-* 默认 = blue-*。
  const T = { n100: "#f7f7f7", n900: "#171717", n600: "#525252", n500: "#737373", n400: "#a1a1a1", blue500: "#2b7fff", blue600: "#155dfc", blue700: "#1447e6", blue800: "#193cb8", white: "#ffffff" }
  assert.ok(ratio(T.n600, T.n100) >= 4.5 && ratio(T.n400, T.n900) >= 4.5)
  // 「继续」：五种强调色都过的是 700 / 800（绿 / 琥珀的 600 只有 3.76 / 3.19，见 lib/accent-contrast.test.ts）。
  assert.ok(ratio(T.white, T.blue700) >= 4.5 && ratio(T.white, T.blue800) >= 4.5)
  // 反例（luna 量的旧值）：确实不够。
  assert.ok(ratio(T.n500, T.n100) < 4.5 && ratio(T.n500, T.n900) < 4.5 && ratio(T.white, T.blue500) < 4.5 && ratio(T.n400, T.white) < 4.5)
  assert.equal(view.QUEUE_MUTED_TEXT, "text-neutral-600 dark:text-neutral-400")
  const row = readSource("../components/ai-chat/thread/queue-paused-row.tsx")
  assert.match(row, /const secondaryClass = `[^`]*\$\{QUEUE_MUTED_TEXT\}/)
  assert.match(row, /const primaryClass =\s+"[^"]*bg-cta [^"]*text-cta-foreground hover:bg-cta-hover"/)
  assert.ok(!/text-text-secondary|bg-accent-500/.test(row.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "说明行不再用 4.43 / 3.76 的旧色")
  const turn = readSource("../components/ai-chat/thread/turns/queued-user-turn.tsx")
  assert.match(turn, /data-testid="queued-row-label" className=\{cx\("shrink-0", QUEUE_MUTED_TEXT\)\}/)
  assert.match(turn, /data-testid="queued-row-label" className=\{QUEUE_BUBBLE_LABEL_TEXT\}/)
  // 时间线泡（整体 opacity-80，叠在白底）：亮色 neutral-600 = 4.49 不够，neutral-700 = 5.60；暗色 neutral-400（叠 #262626）= 4.60。
  const mix = (a: string, b: string, k: number) =>
    "#" + hex(a).map((v, i) => Math.round((v * k + hex(b)[i]! * (1 - k)) * 255).toString(16).padStart(2, "0")).join("")
  const bubbleLabel = (fg: string, sec: string, page: string) => ratio(mix(fg, page, 0.8), mix(mix(sec, page, 0.5), page, 0.8))
  assert.ok(bubbleLabel(T.n600, T.n100, T.white) < 4.5, "泡里亮色 neutral-600 确实不够")
  assert.ok(bubbleLabel("#404040", T.n100, T.white) >= 4.5, "泡里亮色 neutral-700")
  assert.ok(bubbleLabel(T.n400, T.n900, "#262626") >= 4.5, "泡里暗色 neutral-400")
  assert.equal(view.QUEUE_BUBBLE_LABEL_TEXT, "text-neutral-700 dark:text-neutral-400")
})

// ---- luna #163（10-21 定）：排队行链接「马上发给它 / 退回输入框」≥ 4.5:1 ----
test("排队行链接对比度（五种强调色 × 亮暗 × 紧凑行 / 时间线泡 × 常态 / 悬停）：亮 accent-800/900、泡 900/950，暗 accent-400/300、泡 300/200；都 ≥ 4.5", async () => {
  const { THEME_ACCENTS } = await import("./use-theme-accent.ts")
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const mix = (a: string, b: string, k: number) => "#" + ch(a).map((v, i) => Math.round(v * k + ch(b)[i]! * (1 - k)).toString(16).padStart(2, "0")).join("")
  const lum = (h: string) => {
    const [r, g, b] = ch(h).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi! + 0.05) / (lo! + 0.05)
  }
  // tailwind v4 色板（theme.css 按 data-accent 映射：purple → violet）换成 sRGB；500 / 600 用 use-theme-accent.ts 的行内值。
  const RAMP: Record<string, Record<number, string>> = {
    blue: { 200: "#bedbff", 300: "#8ec5ff", 400: "#3392ff", 800: "#193cb8", 900: "#1c398e", 950: "#162456" },
    emerald: { 200: "#a4f4cf", 300: "#5ee9b5", 400: "#00d492", 800: "#006045", 900: "#004f3b", 950: "#002c22" },
    amber: { 200: "#fee685", 300: "#ffd230", 400: "#ffb900", 800: "#973c00", 900: "#7b3306", 950: "#461901" },
    purple: { 200: "#ddd6ff", 300: "#c4b4ff", 400: "#a684ff", 800: "#5d0ec0", 900: "#4d179a", 950: "#2f0d68" },
    slate: { 200: "#ebeff5", 300: "#cad5e2", 400: "#90a1b9", 800: "#1d293d", 900: "#0f172b", 950: "#020618" }
  }
  const shades = (cls: string) => {
    const m = /^text-accent-(\d+) hover:text-accent-(\d+) dark:text-accent-(\d+) dark:hover:text-accent-(\d+)$/.exec(cls)
    assert.ok(m, cls)
    return m.slice(1).map(Number) as [number, number, number, number]
  }
  const [dockL, dockLH, dockD, dockDH] = shades(view.QUEUE_LINK_DOCK)
  const [bubL, bubLH, bubD, bubDH] = shades(view.QUEUE_LINK_BUBBLE)
  // 经典皮肤：亮 secondary #f7f7f7 / primary #fff / full #f7f7f7；暗 secondary #171717 / primary #262626 / full #121212。玻璃皮肤见 kai-e1 笔记的表。
  const surfaces = { L: { sec: "#f7f7f7", pages: ["#ffffff", "#f7f7f7"] }, D: { sec: "#171717", pages: ["#262626", "#121212"] } }
  assert.equal(THEME_ACCENTS.length, Object.keys(RAMP).length)
  for (const accent of THEME_ACCENTS) {
    const A: Record<number, string> = { ...RAMP[accent.id]!, 500: accent.c500, 600: accent.c600 }
    const hover = (bg: string) => mix(A[500]!, bg, 0.1)
    for (const [mode, n, h, bn, bh] of [["L", dockL, dockLH, bubL, bubLH], ["D", dockD, dockDH, bubD, bubDH]] as const) {
      const { sec, pages } = surfaces[mode]
      for (const page of pages) {
        const dock = mix(sec, page, 0.6)
        assert.ok(ratio(A[n]!, dock) >= 4.5, `${accent.id} ${mode} 紧凑行 accent-${n}`)
        assert.ok(ratio(A[h]!, hover(dock)) >= 4.5, `${accent.id} ${mode} 紧凑行悬停 accent-${h}`)
      }
      // 时间线泡：secondary/50 叠 primary，整体 80% 叠在 primary 上。
      const page = pages[0]!
      const bub = mix(sec, page, 0.5)
      const inBubble = (fg: string, bg: string) => ratio(mix(fg, page, 0.8), mix(bg, page, 0.8))
      assert.ok(inBubble(A[bn]!, bub) >= 4.5, `${accent.id} ${mode} 泡 accent-${bn}`)
      assert.ok(inBubble(A[bh]!, hover(bub)) >= 4.5, `${accent.id} ${mode} 泡悬停 accent-${bh}`)
    }
  }
  // 反例：旧方案亮色紧凑行 accent-600 在绿 / 琥珀下不够（h163 前只看了蓝）。
  assert.ok(ratio("#d97706", mix("#f7f7f7", "#ffffff", 0.6)) < 4.5 && ratio("#059669", mix("#f7f7f7", "#ffffff", 0.6)) < 4.5)

  const turn = readSource("../components/ai-chat/thread/turns/queued-user-turn.tsx")
  assert.match(turn, /const actionClass = `\$\{actionBaseClass\} \$\{compact \? QUEUE_LINK_DOCK : QUEUE_LINK_BUBBLE\}`/)
  assert.equal((turn.match(/className=\{actionClass\}/g) ?? []).length, 2, "「马上发给它」「退回输入框」都用它")
  assert.ok(!/text-accent-500/.test(turn), "排队行不再用 accent-500 当字色")
})

// ---- luna #163 h163：非蓝强调色下排队行链接仍是蓝——强调色只改了 500 / 600。theme.css 按 data-accent 补整条 ramp ----
test("强调色整条 ramp：每种可选强调色在 theme.css 里都定义 accent-50…950；源码里用到的每个 accent-* 色阶、排队行链接色阶都被覆盖", async () => {
  const { THEME_ACCENTS } = await import("./use-theme-accent.ts")
  const repo = new URL("../../../../../../", import.meta.url)
  const theme = readFs(new URL("packages/ui/styles/theme.css", repo), "utf8")
  // 色板：purple → violet（#8b5cf6 是 violet-500），其余同名；每一档都必须指向这个色板的同一档。
  const PALETTE: Record<string, string> = { blue: "blue", emerald: "emerald", amber: "amber", purple: "violet", slate: "slate" }
  const defined = (id: string) => {
    const m = new RegExp(`:root\\[data-accent="${id}"\\] \\{([^}]*)\\}`).exec(theme)
    assert.ok(m, `theme.css 缺 :root[data-accent="${id}"]`)
    const pal = PALETTE[id]
    assert.ok(pal, `新强调色 ${id} 要在测试里登记色板`)
    const decls = [...m[1]!.matchAll(/--color-accent-(\d+):\s*var\(--color-([a-z]+)-(\d+)\)/g)]
    for (const d of decls) assert.ok(d[2] === pal && d[3] === d[1], `${id} 的 accent-${d[1]} 指到了 ${d[2]}-${d[3]}`)
    return new Set(decls.map((x) => Number(x[1])))
  }
  const FULL = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  // 源码里实际用到的色阶（renderer + packages/ui）。
  const used = new Set<number>()
  const { readdirSync } = await import("node:fs")
  for (const root of ["apps/desktop/src/renderer/src", "packages/ui"]) {
    const base = new URL(`${root}/`, repo)
    for (const rel of readdirSync(base, { recursive: true }) as string[]) {
      if (!/\.(tsx?|css)$/.test(rel) || rel.includes("node_modules")) continue
      for (const m of readFs(new URL(rel, base), "utf8").matchAll(/accent-(\d+)/g)) used.add(Number(m[1]))
    }
  }
  assert.ok(used.has(800) && used.has(950), "扫描到了源码")
  const linkShades = [view.QUEUE_LINK_DOCK, view.QUEUE_LINK_BUBBLE].flatMap((c) => [...c.matchAll(/accent-(\d+)/g)].map((m) => Number(m[1])))
  for (const accent of THEME_ACCENTS) {
    const have = defined(accent.id)
    for (const n of FULL) assert.ok(have.has(n), `${accent.id} 缺 accent-${n}`)
    for (const n of used) assert.ok(have.has(n), `${accent.id} 没覆盖源码里用到的 accent-${n}`)
    for (const n of linkShades) assert.ok(have.has(n), `${accent.id} 没覆盖排队行链接的 accent-${n}`)
  }
})

// ---- luna #163（10-21）中文空格规则（对称）：中文和拉丁字母 / 数字相邻留空格，前后各自判断；挨中文标点不留 ----
test("中文空格规则（对称）：失败卡和排队行同一个函数（fillProviderFace → placeProviderName）；称呼前后各自判断，挨中文标点不留，英文不变", async () => {
  const { fillProviderFace, placeProviderName } = await import("../lib/provider-face.ts")
  const zh = tr(zhChat as never)
  const en = tr(enChat as never)
  const generic = { kind: "generic" as const }
  type Face = ReturnType<typeof named> | typeof generic
  const row = (provider: Face, t = zh, retry = false) =>
    view.queuePausedView({ reason: "quota", count: 2, composerHasContent: false, failureCardRetryShowing: retry, provider, t }).text
  const card = (key: string, provider: Face, t = zh) => fillProviderFace(t, `chat.${key}`, provider)
  const net = (provider: Face) => card("credentialNetworkNotice", provider).split("，")[0] + "，"
  // 称呼在前（后面接中文）：排队行四个额度句
  assert.equal(row(named("OpenAI")), "OpenAI 额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(row(named("api.example.com")), "api.example.com 额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(row(named("Qwen3")), "Qwen3 额度用完了，排队的 2 条先不发。充值后点继续。", "数字结尾留空格")
  assert.equal(row(named("通义")), "通义额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(row(generic), "模型服务额度用完了，排队的 2 条先不发。充值后点继续。")
  assert.equal(row(named("a-very-long-subdomain.inferen…")), "a-very-long-subdomain.inferen… 额度用完了，排队的 2 条先不发。充值后点继续。", "截断的「…」算西文：留空格")
  assert.equal(row(named("智谱 GLM (Zhipu)")), "智谱 GLM (Zhipu) 额度用完了，排队的 2 条先不发。充值后点继续。", "预设名以「)」结尾算西文")
  assert.equal(row(named("通义"), zh, true), "通义额度用完了，排队的 2 条先不发。充值后先发上面这条，发出去后排队的会接着发。")
  assert.equal(view.queuePausedView({ reason: "quota", count: 1, composerHasContent: false, failureCardRetryShowing: false, provider: generic, t: zh }).text, "模型服务额度用完了，排队的 1 条先不发。充值后点继续。")
  // 称呼在后（前面是中文，后面是中文标点）：连不上卡
  assert.equal(net(generic), "连不上模型服务，")
  assert.equal(net(named("通义")), "连不上通义，")
  assert.equal(net(named("api.example.com")), "连不上 api.example.com，")
  assert.equal(net(named("OpenAI")), "连不上 OpenAI，", "挨中文标点不留空格")
  assert.equal(net(named("Qwen3")), "连不上 Qwen3，")
  assert.equal(net(named("a-very-long-subdomain.inferen…")), "连不上 a-very-long-subdomain.inferen…，", "截断称呼：前面看第一个字，后面挨中文标点")
  assert.equal(net(named("智谱 GLM (Zhipu)")), "连不上智谱 GLM (Zhipu)，", "前面看第一个字：中文开头不留")
  assert.equal(card("credentialNetworkNotice", generic), "连不上模型服务，消息没发出去。检查网络后再试。")
  // 称呼在中间（前后都是中文）：密钥没通过卡
  assert.equal(card("credentialInvalidNotice", named("OpenAI")), "密钥没通过：OpenAI 不认这把密钥，消息没发出去。", "前面是「：」中文标点不留，后面接中文留")
  assert.equal(card("credentialInvalidNotice", generic), "密钥没通过：模型服务不认这把密钥，消息没发出去。")
  assert.equal(card("credentialBillingNotice", named("通义")), "通义说额度或账单有问题，消息没发出去。可以先换个模型，处理好后再试。")
  assert.equal(card("credentialBillingNotice", named("DeepSeek2")), "DeepSeek2 说额度或账单有问题，消息没发出去。可以先换个模型，处理好后再试。")
  assert.equal(card("credentialForbiddenNotice", generic), "模型服务拒绝了这次请求，消息没发出去。可以换个模型，或稍后再试。")
  // 纯函数：中文夹着称呼
  assert.equal(placeProviderName("在 @ 里", "通义", "@"), "在通义里")
  assert.equal(placeProviderName("在@里", "OpenAI", "@"), "在 OpenAI 里", "文案没写空格也补上")
  assert.equal(placeProviderName("「@」", "OpenAI", "@"), "「OpenAI」")
  assert.equal(placeProviderName("@ 说@ said", "通义", "@"), "通义说通义 said")
  // leo M6 / M4b：称呼边上是全角标点、全角字母、半角片假名时，英文从不粘连；中文照规则。
  const quota = (provider: Face, t: typeof zh) => row(provider, t).split(/，|, so/)[0]
  assert.equal(quota(named("Claude（工作）"), en), "Claude（工作） is out of credit")
  assert.equal(quota(named("Claude（工作）"), zh), "Claude（工作）额度用完了")
  assert.equal(quota(named("ｸﾛｰﾄﾞ"), en), "ｸﾛｰﾄﾞ is out of credit")
  assert.equal(quota(named("ｸﾛｰﾄﾞ"), zh), "ｸﾛｰﾄﾞ额度用完了", "半角片假名算中日韩文字")
  assert.equal(quota(named("ＡＢＣ"), zh), "ＡＢＣ 额度用完了", "全角字母按拉丁")
  const reach = (provider: Face, t: typeof zh) => card("credentialNetworkNotice", provider, t).split(/[.。，]/)[0]
  assert.equal(reach(named("「通义」"), en), "Could not reach 「通义」")
  assert.equal(reach(named("ＡＢＣ"), en), "Could not reach ＡＢＣ")
  assert.equal(reach(named("「通义」"), zh), "连不上「通义」")
  assert.equal(reach(named("ＡＢＣ"), zh), "连不上 ＡＢＣ")
  assert.equal(placeProviderName("@ said", "Ｑｗｅｎ３", "@"), "Ｑｗｅｎ３ said")
  assert.equal(placeProviderName("用@问", "Ｑｗｅｎ３", "@"), "用 Ｑｗｅｎ３ 问", "全角字母数字和中文之间留空格")
  assert.equal(placeProviderName("@ＡＩ", "通义", "@"), "通义 ＡＩ", "文案那边的全角字母也按拉丁")
  // 英文不变
  assert.equal(row(generic, en), "The model service is out of credit, so 2 queued messages are on hold. Top up, then press Continue.")
  assert.equal(row(named("通义"), en), "通义 is out of credit, so 2 queued messages are on hold. Top up, then press Continue.")
  assert.equal(card("credentialNetworkNotice", named("通义"), en), "Could not reach 通义. The message was not sent. Check the network and try again.")
  assert.equal(card("credentialNetworkNotice", named("OpenAI"), en), "Could not reach OpenAI. The message was not sent. Check the network and try again.")
  // 接线：两个界面都只经 fillProviderFace 填称呼，不各自插值。
  const viewSrc = readSource("../components/ai-chat/thread/queue-paused-view.ts")
  assert.equal((viewSrc.match(/fillProviderFace\(/g) ?? []).length, 2, "排队行两处（原因句、额度重发句）都走 fillProviderFace")
  assert.ok(!/provider: input\.provider\.|\.name\b.*provider/.test(viewSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), "排队行不自己拿 face.name 插值")
  for (const file of ["thread-credential-invalid-notice.tsx", "thread-credential-network-notice.tsx", "thread-credential-restricted-notice.tsx"]) {
    const src = readSource(`../components/ai-chat/thread/${file}`).replace(/\/\/.*$/gm, "")
    assert.match(src, /message=\{fillProviderFace\(t, /, file)
    assert.ok(!/face\.name|kind === "named"/.test(src), `${file} 绕开了 fillProviderFace`)
  }
})
