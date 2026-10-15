/**
 * leo r6 BLOCK（#136）：左上返回切会话必须和侧栏一样——停车上一会话的轮、存它的稿、还目标会话的稿、复位运行态。
 * 真走 applyHistoryEntry → selectPersistedSession / loadSession（只把「改路由」换成空函数），后续停止 / Enter / ⌘Enter 真走发送链路。
 * 另：跨会话发送失败要把那一会话的停车档收成空闲；出字前回滚作废的 runId 迟到回执不误中止；三处存活变异各一条。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
type Call = { path: string; args: any[] }
const calls: Call[] = []
let runSeq = 0
let holdRun: { resolve: (v: any) => void } | null = null
let parkNextRun = false
/** main 里还在的会话（session.list）。 */
let liveSessions = ["ses_one", "ses_A"]
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      calls.push({ path, args })
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      return answer(path, args)
    }
  })
}
async function answer(path: string, _args: any[]): Promise<any> {
  if (path === ".agent.run") {
    if (parkNextRun) {
      parkNextRun = false
      return new Promise((resolve) => {
        holdRun = { resolve }
      })
    }
    runSeq += 1
    return { ok: true, runId: `run_send_${runSeq}` }
  }
  if (path === ".session.list") return liveSessions.map((id) => ({ id, title: id }))
  if (path === ".session.messages" || path.endsWith(".list")) return []
  return undefined
}
;(globalThis as any).window = { ide: bridge(""), matchMedia: () => ({ matches: true }) }
const { useChatStore } = await import("../../stores/chat-store.ts")
const { useAttentionStore } = await import("../../stores/attention/attention-store.ts")
const { applyHistoryEntry } = await import("./apply-entry.ts")
const { setHistoryRouterForTest } = await import("./history-router.ts")
const { loadSession } = await import("../session-lifecycle.ts")
const { dispatchAgentEvent } = await import("../../stores/attention/dispatch-agent-event.ts")
const { abortComposerRun } = await import("../composer-run-control.ts")
const { sendComposerMessage } = await import("../runtime-interact/send-composer-run.ts")
const { steerPreparedText } = await import("../runtime-interact/steer-composer.ts")
const { submitComposer } = await import("../send-composer.ts")
const { listFollowups, takeNextFollowup } = await import("../followup-queue.ts")
const { tryStartNextFollowup, drainFollowupAutostart, resetFollowupAutostart } = await import("../followup-autostart.ts")
const { failComposerSend } = await import("../runtime-interact/fail-composer-send.ts")
const { applyOptimisticTitle, resetSessionTitleRollbackForTest } = await import("../session-title.ts")
const snap = await import("../../stores/restored-images-snapshot.ts")
const { resetSentUserTurnsForTest } = await import("../../stores/sent-user-turns.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("../../stores/discarded-pre-output-runs.ts")
const { resetQueuedComposerSendForTest, cancelQueuedComposerSend } = await import("../queue-composer-send.ts")
const { resetComposerRunningOwnerForTest } = await import("../runtime-interact/composer-running-owner.ts")
const assets = await import("../composer-assets.ts")
const { useNavHistoryStore } = await import("./nav-history-store.ts")
const { travelHistory } = await import("./nav-history-controller.ts")
const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }
setHistoryRouterForTest({ navigate: async () => undefined, history: { subscribe: () => () => undefined }, state: { location: { pathname: "/" } } })

afterEach(() => {
  cancelQueuedComposerSend()
  resetQueuedComposerSendForTest()
  resetComposerRunningOwnerForTest()
  resetDiscardedPreOutputRunsForTest()
  resetSentUserTurnsForTest()
  resetSessionTitleRollbackForTest()
  assets.clearComposerAssets()
  snap.clearRestoredImages()
  resetFollowupAutostart()
  for (const id of ["ses_one", "ses_A"]) while (takeNextFollowup(id)) { /* 清空排队 */ }
  useAttentionStore.setState({ parks: {}, runSessions: {} } as never)
  calls.length = 0
  holdRun = null
  parkNextRun = false
  liveSessions = ["ses_one", "ses_A"]
})

const repos = [
  { id: "ws", kind: "workspace", name: "ws" },
  { id: "ses_one", kind: "session", name: "会话一", workspaceId: "ws", parentId: "ws" },
  { id: "ses_A", kind: "session", name: "会话A", workspaceId: "ws", parentId: "ws" }
]

/** 会话 A 在跑（run_A 已认领），A 的输入框里后打了字；会话一存着自己的草稿。 */
function aRunning() {
  useChatStore.setState({
    workspaceId: "ws",
    repositories: repos,
    sessionId: "ses_A",
    sessionTitle: "会话A",
    running: true,
    runId: "run_A",
    runStartedAt: 1,
    composer: "A里后打的字",
    error: null,
    notice: null,
    pendingApproval: null,
    hasKey: true,
    modelId: "stub-e2e",
    pendingStreamEvents: [],
    sessionDrafts: { ses_one: { text: "会话一的草稿", assets: [], quotedContexts: [] } },
    messages: [
      { id: "uA", role: "user", content: "A在跑", createdAt: 1 },
      { id: "aA", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  } as never)
}

const entry = (sessionId: string, title: string) => ({ id: `session:${sessionId}`, title, params: { kind: "session", sessionId, workspaceId: "ws" } }) as never

async function backToOne() {
  await applyHistoryEntry(entry("ses_one", "会话一"), () => false)
  await flush()
}

test("左上返回到会话一：停车 A、存 A 的稿、还会话一的稿、运行态复位", async () => {
  aRunning()
  await backToOne()
  const s = useChatStore.getState()
  assert.equal(s.sessionId, "ses_one")
  assert.equal(s.composer, "会话一的草稿", "会话一的草稿还回来")
  assert.equal(s.getSessionDraft("ses_A")?.text, "A里后打的字", "A 的稿存进 A")
  assert.ok(!s.messages.some((m: any) => m.content === "A在跑"), "会话一不显示 A 的消息")
  const park = useAttentionStore.getState().parks.ses_A
  assert.equal(park?.running, true)
  assert.equal(park?.runId, "run_A")
  // 状态位最后看。
  assert.equal(s.running, false, "会话一不挂 A 的执行中")
  assert.equal(s.runId, null)
})

test("左上返回后 A 跑完：会话一仍空闲；会话一里点停止不中止 A", async () => {
  aRunning()
  await backToOne()
  dispatchAgentEvent({ type: "run.end", runId: "run_A", sessionId: "ses_A" } as never)
  await abortComposerRun()
  assert.deepEqual(calls.filter((c) => c.path === ".ai.abort").map((c) => c.args[0]), [], "不中止 run_A")
  assert.equal(useChatStore.getState().running, false)
})

test("左上返回后会话一里 Enter 直接发出（不进排队）；⌘Enter 纠偏也是新发一轮，不塞进 run_A", async () => {
  aRunning()
  await backToOne()
  useChatStore.getState().setComposer("会话一新话")
  await submitComposer("send")
  await flush()
  const runs = calls.filter((c) => c.path === ".agent.run").map((c) => c.args[0])
  assert.equal(runs.length, 1, "直接开跑")
  assert.equal(runs[0].sessionId, "ses_one")
  assert.deepEqual(listFollowups("ses_one"), [], "没进排队")
  // 收工后 ⌘Enter：不是往 run_A 纠偏。
  dispatchAgentEvent({ type: "run.end", runId: "run_send_1", sessionId: "ses_one" } as never)
  await flush()
  calls.length = 0
  await steerPreparedText("纠偏一句")
  await flush()
  assert.deepEqual(calls.filter((c) => c.path === ".agent.steer"), [], "不往 run_A 纠偏")
  assert.equal(calls.filter((c) => c.path === ".agent.run").length, 1)
})

/** A 在跑且 run_A 已登记到 run → 会话表（全局最早的一条就是 run_A）。 */
function aRunningRemembered() {
  aRunning()
  useAttentionStore.getState().rememberRun("run_A", "ses_A")
}

/** 会话一发出自己的一轮并认领，返回它的 runId。 */
async function oneStartsOwnTurn(text = "会话一自己的一轮") {
  useChatStore.getState().setComposer(text)
  await submitComposer("send")
  await flush()
  const own = useChatStore.getState().runId
  assert.ok(own && own !== "run_A", `会话一认领了自己的轮 got ${own}`)
  return own as string
}

test("leo r6b ①：A 仍在跑时返回会话一，会话一开了自己的一轮后 ⌘Enter——纠偏进会话一自己的轮，不进 run_A", async () => {
  aRunningRemembered()
  await backToOne()
  const own = await oneStartsOwnTurn()
  calls.length = 0
  const outcome = await steerPreparedText("纠偏一句")
  await flush()
  const steers = calls.filter((c) => c.path === ".agent.steer").map((c) => c.args[0])
  assert.equal(steers.length, 1, "走了一次 agent.steer")
  assert.equal(steers[0].sessionId, "ses_one")
  assert.equal(steers[0].runId, own, "带会话一自己的 runId，不是 run_A")
  assert.equal(calls.filter((c) => c.path === ".agent.run").length, 0, "没另开一轮")
  assert.equal(outcome, "steered")
  assert.equal(useAttentionStore.getState().parks.ses_A?.running, true, "A 仍在后台跑")
})

test("leo r6b ②：A 仍在跑时返回会话一，会话一自己的轮收工后排队项自启——真的发出去", async () => {
  aRunningRemembered()
  await backToOne()
  const own = await oneStartsOwnTurn()
  // 会话一自己在跑时 Enter：进会话一的排队。
  useChatStore.getState().setComposer("一的排队")
  await submitComposer("send")
  await flush()
  assert.deepEqual(listFollowups("ses_one").map((i) => i.prompt), ["一的排队"], "先进了会话一的排队")
  dispatchAgentEvent({ type: "run.end", runId: own, sessionId: "ses_one" } as never)
  await flush()
  calls.length = 0
  // 和 useFollowupAutostart 的 kick 同一套入参（前台会话的 running / pendingApproval）。
  const s = useChatStore.getState()
  const started = tryStartNextFollowup({
    sessionId: s.sessionId,
    running: s.running,
    pendingApproval: Boolean(s.pendingApproval),
    send: (item) => sendComposerMessage({ content: item.prompt, assets: item.assets })
  })
  await drainFollowupAutostart()
  await flush()
  const runs = calls.filter((c) => c.path === ".agent.run").map((c) => c.args[0])
  assert.equal(runs.length, 1, "排队项真的发出（agent.run）")
  assert.equal(runs[0].sessionId, "ses_one")
  assert.match(JSON.stringify(runs[0]), /一的排队/)
  assert.deepEqual(listFollowups("ses_one"), [], "排队已取走")
  assert.equal(useAttentionStore.getState().parks.ses_A?.running, true, "A 仍在后台跑")
  assert.equal(started, true)
})

test("leo r6b ③：A 仍在跑时返回会话一——(a) 会话一空闲时 abortComposerRun（换引擎路径）不中止 A；(b) 会话一自己在跑时停止只中止自己的轮", async () => {
  aRunningRemembered()
  await backToOne()
  await abortComposerRun()
  assert.deepEqual(calls.filter((c) => c.path === ".ai.abort").map((c) => c.args[0]), [], "(a) 空闲时不中止任何轮")
  assert.equal(useAttentionStore.getState().parks.ses_A?.running, true, "(a) A 仍在跑")
  useChatStore.setState({ notice: null } as never)
  const own = await oneStartsOwnTurn()
  calls.length = 0
  await abortComposerRun()
  assert.deepEqual(calls.filter((c) => c.path === ".ai.abort").map((c) => c.args[0]), [own], "(b) 只中止会话一自己的轮")
  assert.equal(useAttentionStore.getState().parks.ses_A?.running, true, "(b) A 仍在跑")
  assert.equal(useChatStore.getState().running, false)
})

test("左上返回再回到 A（A 期间跑完）：A 显示空闲", async () => {
  aRunning()
  await backToOne()
  dispatchAgentEvent({ type: "run.end", runId: "run_A", sessionId: "ses_A" } as never)
  await applyHistoryEntry(entry("ses_A", "会话A"), () => false)
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.sessionId, "ses_A")
  assert.equal(s.running, false, "A 不永远转圈")
  assert.equal(s.composer, "A里后打的字", "A 的稿回来")
  assert.equal(s.getSessionDraft("ses_one")?.text, "会话一的草稿", "会话一的稿存回会话一")
})

test("A 发出后还没开跑就切走，发送随后失败：A 的停车档收成空闲，切回不转圈、稿在", async () => {
  aRunning()
  useChatStore.setState({ runId: null, composer: "" } as never)
  await loadSession("ses_one", "会话一")
  assert.equal(useAttentionStore.getState().parks.ses_A?.running, true)
  failComposerSend({ text: "A在跑", reason: "发送失败了", sessionId: "ses_A" })
  assert.equal(useChatStore.getState().running, false)
  assert.equal(useChatStore.getState().composer, "会话一的草稿", "当前会话输入框不动")
  await applyHistoryEntry(entry("ses_A", "会话A"), () => false)
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.running, false, "切回 A 不永远转圈")
  assert.equal(s.runId, null)
  assert.match(s.composer, /A在跑/, "A 的稿还回")
})

test("leo r6 soft：后台出字前回滚作废的 runId，迟到的 agent.run 回执不中止任何轮、不被重新认领成 A 在跑、不往当前会话还稿", async () => {
  useChatStore.setState({ workspaceId: "ws", repositories: repos, sessionId: "ses_A", sessionTitle: "会话A", running: false, runId: null, composer: "背景这一句", error: null, notice: null, pendingApproval: null, hasKey: true, modelId: "stub-e2e", pendingStreamEvents: [], sessionDrafts: {}, messages: [] } as never)
  parkNextRun = true
  const sending = sendComposerMessage()
  await flush()
  assert.ok(holdRun, "agent.run 挂着")
  await loadSession("ses_one", "会话一")
  useChatStore.getState().setComposer("会话一正在打")
  dispatchAgentEvent({ type: "run.error", runId: "run_late", sessionId: "ses_A", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  holdRun!.resolve({ ok: true, runId: "run_late" })
  await sending
  await flush()
  assert.deepEqual(calls.filter((c) => c.path === ".ai.abort"), [], "没把作废的 run 当孤儿中止")
  assert.equal(useChatStore.getState().composer, "会话一正在打", "当前会话输入框不被还稿")
  assert.equal(useChatStore.getState().error, null)
  assert.notEqual(useAttentionStore.getState().parks.ses_A?.running, true, "作废的 run 不被重新认领成 A 在跑")
  await applyHistoryEntry(entry("ses_A", "会话A"), () => false)
  await flush()
  assert.equal(useChatStore.getState().running, false, "切回 A 不转圈")
  assert.equal(useChatStore.getState().runId, null)
})

test("leo r6 soft（变异：白卡读了别的会话的快照）：只认当前会话自己的快照", () => {
  snap.noteRestoredImages("ses_A", [{ id: "ast_a", name: "a.png", mediaType: "image/png" }] as never, "A那句")
  const all = snap.getRestoredImagesSnapshots()
  assert.equal(snap.snapshotForSession(all, "ses_one"), null)
  assert.equal(snap.snapshotForSession(all, null), null)
  assert.equal(snap.snapshotForSession(all, "ses_A")?.images, 1)
})

test("leo r6 soft（变异：复原标题无条件改当前页头）：后台会话的首句标题复原不动当前会话标题", () => {
  useChatStore.setState({ workspaceId: "ws", repositories: repos.map((r) => (r.id === "ses_A" ? { ...r, name: "新对话" } : r)), sessionId: "ses_A", sessionTitle: "新对话", running: true, runId: null, composer: "", error: null, hasKey: true, modelId: "stub-e2e", pendingStreamEvents: [], messages: [] } as never)
  useChatStore.getState().appendUserMessage("后台首句标题", undefined)
  applyOptimisticTitle("后台首句标题")
  const written = useChatStore.getState().repositories.find((r: any) => r.id === "ses_A")?.name
  assert.notEqual(written, "新对话")
  useChatStore.setState({ sessionId: "ses_one", sessionTitle: "会话一", running: false, messages: [] } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_bgt", sessionId: "ses_A", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  assert.equal(useChatStore.getState().repositories.find((r: any) => r.id === "ses_A")?.name, "新对话", "A 的标题复原")
  assert.equal(useChatStore.getState().sessionTitle, "会话一", "当前页头不被改成 A 的旧标题")
})

test("leo r6 soft（变异：站住后没忘掉那一句）：后台这一轮 run.end 之后的出字前失败不再拍那句的快照", () => {
  useChatStore.setState({ workspaceId: "ws", repositories: repos, sessionId: "ses_A", sessionTitle: "会话A", running: true, runId: null, composer: "", error: null, hasKey: true, modelId: "stub-e2e", pendingStreamEvents: [], messages: [] } as never)
  useChatStore.getState().appendUserMessage("已站住的一句", [{ assetId: "ast_s", mediaType: "image/png", name: "s.png" }] as never)
  useChatStore.setState({ sessionId: "ses_one", sessionTitle: "会话一", running: false, messages: [] } as never)
  dispatchAgentEvent({ type: "run.end", runId: "run_ok", sessionId: "ses_A" } as never)
  dispatchAgentEvent({ type: "run.error", runId: "run_next", sessionId: "ses_A", message: "provider_unreachable", code: "provider_unreachable", preOutput: true } as never)
  assert.equal(snap.restoredImagesFor("ses_A"), null, "站住的那句不会被当成回滚的一句")
})

const home = { id: "chat:new", title: "新对话", params: { kind: "route", to: "/" } } as never

test("jojo r6 P1：左上返回到已被删的会话——跳过它落到前一页，不顶着它的标题挂着 A 的消息", async () => {
  aRunning()
  useChatStore.setState({ running: false, runId: null } as never)
  const ghost = entry("ses_ghost", "被删的新对话")
  useNavHistoryStore.setState({ past: [home, entry("ses_one", "会话一"), ghost], current: entry("ses_A", "会话A"), future: [], seeded: true } as never)
  await travelHistory("back")
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.sessionId, "ses_one", "落到被删那页之前的会话一")
  assert.notEqual(s.sessionTitle, "被删的新对话")
  assert.equal(s.composer, "会话一的草稿")
  const nav = useNavHistoryStore.getState()
  assert.equal((nav.current as any).id, "session:ses_one")
  assert.ok(![...nav.past, ...nav.future].some((e: any) => e.id === "session:ses_ghost"), "被删的那页从历史里去掉")
})

test("jojo r6 P1：前面没有别的页时回空首页（不是不存在的会话）", async () => {
  aRunning()
  useChatStore.setState({ running: false, runId: null } as never)
  useNavHistoryStore.setState({ past: [entry("ses_ghost", "被删的新对话")], current: entry("ses_A", "会话A"), future: [], seeded: true } as never)
  await travelHistory("back")
  await flush()
  const s = useChatStore.getState()
  assert.equal(s.sessionId, null, "空首页")
  assert.deepEqual(s.messages, [], "不挂 A 的消息")
  assert.equal(s.getSessionDraft("ses_A")?.text, "A里后打的字", "A 的稿存回 A")
})
