/**
 * kai send-p2（jojo 巡检 211e3bbb / #163）三个发送链 P2，真走 submitComposer / sendComposerMessage / chat-store 回滚，
 * 只假 IPC 桥（window.ide）和输入框 DOM。
 * A：运行中贴图 + Ctrl+Enter 插话——图要跟着进当前 run；收不了图就整条老实排到下一轮，绝不出「已收到」。
 * B：建会话慢时点发送按钮发出第一句——发出后输入框和新会话草稿都空，再按回车不重发。
 * C：排队首发 A 出字前额度失败、排在后面的 B——A 的失败稿只写回一次，B 不抢跑、接在 A 后还回输入框。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { STEER_IMAGES_UNSUPPORTED } from "@enjoy-agents/ipc-contract/quoted-context"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}

let dbAssets: Record<string, Array<Record<string, unknown>>> = {}
const runs: any[] = []
const steers: Array<{ sessionId: string; text: string; attachments?: string[] }> = []
let onRun: (input: any) => unknown = () => ({ ok: true, runId: "run_default" })
let steerImpl: (input: { sessionId: string; text: string; attachments?: string[] }) => unknown = () => ({ ok: true })
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".session.drafts.loadSync") return {}
      if (path === ".session.drafts.loadAssetsSync") return JSON.parse(JSON.stringify(dbAssets))
      if (path === ".session.drafts.saveAssets") {
        const input = args[0] as { sessionId: string; assets: Array<Record<string, unknown>> }
        if (input.assets.length) dbAssets[input.sessionId] = input.assets
        else delete dbAssets[input.sessionId]
        return undefined
      }
      return (async () => {
        if (path === ".agent.run") {
          runs.push(args[0])
          return onRun(args[0])
        }
        if (path === ".agent.steer") {
          const input = args[0] as { sessionId: string; text: string; attachments?: string[] }
          steers.push(input)
          const result = await steerImpl(input)
          // 真 main：落库事务里顺手清掉这几张图的草稿附件。
          const ids = new Set(input.attachments ?? [])
          if (ids.size) {
            const rest = (dbAssets[input.sessionId] ?? []).filter((a) => !ids.has(String(a.id)))
            if (rest.length) dbAssets[input.sessionId] = rest
            else delete dbAssets[input.sessionId]
          }
          return result
        }
        if (path === ".session.messages" || path.endsWith(".list")) return []
        return undefined
      })()
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

/**
 * 受控输入框（React 19）：DOM 值每次重渲染都会被改回组件的 shown；shown 只按 use-composer-ime 的规则变
 * （这里用它真正调用的那几个判定函数）。store 变化后的重渲染是异步的（setTimeout 0）。
 */
let dom = ""
let shown = ""
const el = {
  get value() {
    return dom
  },
  set value(next: string) {
    dom = next
  },
  getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null)
}
;(globalThis as any).document = { activeElement: el, querySelector: () => el }

const { useChatStore } = await import("../../stores/chat-store.ts")
const { submitComposer, sendComposerMessage } = await import("../send-composer.ts")
const { captureComposerEnter, flushComposerDomToStore, shouldHoldComposerStoreSync } = await import("../composer-dom.ts")
const ime = await import("../composer-ime.ts")
const { beginNewSessionCreate, finishNewSessionCreate, resetNewSessionCreateForTest } = await import("../new-session-create.ts")
const qcs = await import("../queue-composer-send.ts")
const { setComposerWritebackHeld } = await import("../composer-sync-lock.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")
const { resetDiscardedPreOutputRunsForTest } = await import("../../stores/discarded-pre-output-runs.ts")
const { dispatchAgentEvent } = await import("../../stores/attention/dispatch-agent-event.ts")
const fq = await import("../followup-queue.ts")
const { tryStartNextFollowup, drainFollowupAutostart, resetFollowupAutostart } = await import("../followup-autostart.ts")
const assets = await import("../composer-assets.ts")
const storage = await import("../../lib/session-draft-storage.ts")

storage.installSessionDraftPersistence()

let controlled = false
useChatStore.subscribe((state, prev) => {
  if (!controlled) return
  const composerChanged = state.composer !== prev.composer
  const sessionChanged = state.sessionId !== prev.sessionId
  if (!composerChanged && !sessionChanged) return
  setTimeout(() => {
    dom = shown // 重渲染：受控值盖回 DOM
    const now = useChatStore.getState()
    if (composerChanged) {
      if (!now.composer && ime.shouldClearShownOnQueuedSend(shown, ime.lastComposerSubmitted())) shown = ""
      else if (!shouldHoldComposerStoreSync()) shown = now.composer
    }
    if (sessionChanged && ime.shouldResetShownOnSessionChange(shown, now.composer)) shown = now.composer
    dom = shown
  }, 0)
})

function userTypes(text: string) {
  dom = text
  shown = text
  useChatStore.getState().setComposer(text)
}

const flush = async () => {
  for (let i = 0; i < 40; i += 1) await new Promise((r) => setTimeout(r, 0))
}
const att = (t: string) => ({ text: t, launched: false, cancelled: false, done: false, paused: false }) as never

afterEach(async () => {
  await flush()
  controlled = false
  qcs.cancelQueuedComposerSend()
  resetNewSessionCreateForTest()
  qcs.resetQueuedComposerSendForTest()
  resetComposerRunningOwnerForTest()
  resetDiscardedPreOutputRunsForTest()
  resetFollowupAutostart()
  fq.resetFollowupsForTest()
  assets.clearComposerAssets()
  storage.resetPersistedDraftAssetsForTest()
  storage.resetPersistedDraftCacheForTest()
  memory.clear()
  dbAssets = {}
  runs.length = 0
  steers.length = 0
  onRun = () => ({ ok: true, runId: "run_default" })
  steerImpl = () => ({ ok: true })
  dom = ""
  shown = ""
  ime.noteComposerSubmitted("")
})

// ───────────────────────── A：带图插话 ─────────────────────────

const IMG = { id: "ast_orange", name: "orange.png", mediaType: "image/png" }
const rows = (sid: string) => (dbAssets[sid] ?? []) as Array<{ id: string; queued?: { itemId: string } }>

/** 「very slow 插图测试」跑着；输入框贴图（落草稿附件）+ 打字。 */
function runningWithImageDraft(sessionId: string, text: string, runtimeId = "enjoy-local") {
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: true,
    runId: `run_${sessionId}`,
    runtimeId,
    composer: "",
    error: null,
    messages: [{ id: "u0", role: "user", content: "very slow 插图测试", createdAt: 1 }]
  } as never)
  assets.queueComposerAsset({ ...IMG })
  userTypes(text)
  assert.deepEqual(rows(sessionId).map((r) => r.id), [IMG.id], "前提：图已落草稿附件")
}

test("A：Ctrl+Enter 插话带图——图随 agent.steer 进当前 run，气泡带图，托盘 / 草稿附件清空，才提示已收到", async () => {
  runningWithImageDraft("ses_a1", "顺便看这张橙色图")
  await submitComposer("steer")
  assert.equal(steers.length, 1)
  assert.deepEqual(steers[0]!.attachments, [IMG.id], "图跟着插话一起交给当前 run")
  const last = useChatStore.getState().messages.at(-1)!
  assert.equal(last.role, "user")
  assert.equal(last.content, "顺便看这张橙色图")
  assert.deepEqual(last.assets?.map((a) => a.assetId), [IMG.id], "气泡带图")
  assert.deepEqual(assets.listComposerAssets(), [], "托盘清空")
  assert.equal(useChatStore.getState().composer, "")
  assert.equal(storage.readPersistedDraftAssets("ses_a1"), undefined, "草稿附件（含 renderer 缓存）不再挂着这张图")
  assert.equal(fq.getRuntimeHint(), "steered")
})

test("A：运行中收不了图（STEER_IMAGES_UNSUPPORTED）——字和图整条排到下一轮，提示说排队，不说已收到", async () => {
  runningWithImageDraft("ses_a2", "顺便看这张橙色图", "claude")
  steerImpl = () => {
    throw new Error(STEER_IMAGES_UNSUPPORTED)
  }
  await submitComposer("steer")
  assert.equal(steers.length, 1)
  const [item, ...more] = fq.listFollowups("ses_a2")
  assert.ok(item, "整条进了队列")
  assert.equal(more.length, 0)
  assert.equal(item.prompt, "顺便看这张橙色图")
  assert.deepEqual(item.assets.map((a) => a.id), [IMG.id], "图跟着这条排队，没被扣在托盘")
  assert.deepEqual(rows("ses_a2").map((r) => [r.id, r.queued?.itemId]), [[IMG.id, item.id]], "草稿附件改打排队标记")
  assert.deepEqual(assets.listComposerAssets(), [])
  assert.equal(useChatStore.getState().composer, "", "输入框清空（这条在队列里）")
  assert.equal(fq.getRuntimeHint(), "imageSteerQueued", "提示：运行中收不了图，排到下一轮")
  assert.equal(useChatStore.getState().messages.at(-1)?.content, "very slow 插图测试", "没有冒充已发出的气泡")
})

test("A：插话失败——图回托盘、字留在输入框，不提示已收到", async () => {
  runningWithImageDraft("ses_a3", "顺便看这张橙色图")
  steerImpl = () => {
    throw new Error("ASSET_READ_FAILED")
  }
  await submitComposer("steer")
  assert.deepEqual(assets.listComposerAssets().map((a) => a.id), [IMG.id], "图回托盘")
  assert.equal(useChatStore.getState().composer, "顺便看这张橙色图")
  assert.notEqual(fq.getRuntimeHint(), "steered")
  assert.equal(fq.listFollowups("ses_a3").length, 0)
  assert.deepEqual(rows("ses_a3").map((r) => r.id), [IMG.id], "草稿附件还在")
})

test("A：main 已没有活 run（仍在收尾）——字和图进排队，图打排队标记，提示排队", async () => {
  runningWithImageDraft("ses_a4", "顺便看这张橙色图")
  steerImpl = () => {
    throw new Error("STEER_NO_ACTIVE_RUN")
  }
  await submitComposer("steer")
  const [item] = fq.listFollowups("ses_a4")
  assert.ok(item)
  assert.deepEqual(item.assets.map((a) => a.id), [IMG.id])
  assert.deepEqual(rows("ses_a4").map((r) => [r.id, r.queued?.itemId]), [[IMG.id, item.id]])
  assert.equal(storage.composerDraftForSession("ses_a4")?.assets, undefined, "切回不冒只图草稿")
  assert.deepEqual(assets.listComposerAssets(), [])
  assert.equal(fq.getRuntimeHint(), "queued")
})

test("A 对照：纯文字插话不变——不带 attachments，提示已收到", async () => {
  useChatStore.setState({ workspaceId: "ws", sessionId: "ses_a5", running: true, runId: "run_a5", runtimeId: "enjoy-local", composer: "", error: null, messages: [] } as never)
  userTypes("换个思路")
  await submitComposer("steer")
  assert.equal(steers.length, 1)
  assert.equal(steers[0]!.attachments, undefined)
  assert.equal(fq.getRuntimeHint(), "steered")
})
