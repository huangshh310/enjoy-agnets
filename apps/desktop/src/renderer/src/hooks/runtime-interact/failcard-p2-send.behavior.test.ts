/**
 * luna 巡检 P2-2 + 同会话再发 / jojo #169 P3（渲染端）。真走 dispatchAgentEvent（run.error 出字前回滚）/
 * sendComposerMessage（发送闸 → agent.run → 乐观助手泡 / main 拒发收口）。失败卡称呼见 failcard-p2-card.behavior.test。
 * - P2-2：换到 Amp 后发一句，底脚当场是「Amp」，不是上一台本地模型「Amp · E2E Stub」。
 * - 同会话再发 / jojo P3：渲染端闸放行、main 按落盘校验态拒掉（credential_invalid）→ 仍是具名密钥卡 +「先改好密钥再发。」。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) }
const runInputs: any[] = []
let runResult: unknown = { ok: true, runId: "run_ok" }
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".agent.run") {
        runInputs.push(args[0])
        return Promise.resolve(runResult)
      }
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { dispatchAgentEvent } = await import("../../stores/attention/dispatch-agent-event.ts")
const { rememberAgentTools } = await import("../agent-tools-cache.ts")
const { rememberChatReadiness, rememberCodingRuntime } = await import("../chat-readiness-cache.ts")
const { buildChatReadiness } = await import("@enjoy-agents/ipc-contract/chat-readiness")
const { turnModelText } = await import("../../lib/turn-model-text.ts")
const nudge = await import("../credential-send-nudge.ts")
const pending = await import("../pending-failed-send.ts")
const queue = await import("../followup-queue.ts")
const { resetClientRequestIdForTest } = await import("./client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")

const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }

afterEach(() => {
  runInputs.length = 0
  runResult = { ok: true, runId: "run_ok" }
  nudge.resetCredentialSendNudgeForTest()
  pending.resetPendingFailedSendForTest()
  queue.resetFollowupsForTest()
  resetClientRequestIdForTest()
  resetComposerRunningOwnerForTest()
  rememberChatReadiness(undefined)
  rememberAgentTools([])
})


function ampTool(bound?: string) {
  return {
    id: "amp", label: "Amp", transport: "acp-host", binaries: ["amp"], acpArgs: [], needsLoginHint: "", available: true,
    comingSoon: false, skillOnly: false, enabled: true, detectedPath: "/bin/amp", version: null, status: "ready", models: [],
    installKind: "npm", installCommand: "", docsUrl: "", useCustomProvider: Boolean(bound), providerId: bound,
    supportedApiStyles: [], authAccount: { loggedIn: true },
    capabilities: {
      spawn: true, models: "catalog", login: true, quota: false, thinking: "none", fast: "none", permissionUi: "enjoy-hmac",
      executionModes: "hidden", slash: "hidden", resumeFork: false, compact: "cli", askUser: "hidden", steer: true,
      realtime: false, delegate: false, providerBind: "none"
    }
  } as never
}

let seq = 0
function idle(runtimeId: string, extra: Record<string, unknown> = {}) {
  seq += 1
  const sessionId = `ses_fc_${seq}`
  useChatStore.setState({
    workspaceId: "ws", sessionId, running: false, runId: null, composer: "", error: null, notice: null,
    pendingApproval: null, hasKey: true, modelId: "stub-e2e", modelLabel: "E2E Stub", runtimeId,
    pendingStreamEvents: [], preparingHint: false, preparingSessionId: null, sessionModels: {},
    messages: [{ id: "u0", role: "user", content: "更早一轮", createdAt: 1 }, { id: "a0", role: "assistant", content: "好的", createdAt: 2 }],
    ...extra
  } as never)
  return sessionId
}
/** 前台会话发出 text、还没出字。 */
function inFlight(runtimeId: string, text: string) {
  const runId = `run_fc_${seq + 1}`
  const sessionId = idle(runtimeId, {
    running: true, runId,
    messages: [{ id: "u1", role: "user", content: text, createdAt: 1 }, { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }]
  })
  return { sessionId, runId }
}
function runError(sessionId: string, runId: string, code: string, routeFields: Record<string, string>) {
  dispatchAgentEvent({ type: "run.error", runId, sessionId, message: code, code, preOutput: true, ...routeFields } as never)
}
function keyReadiness(state: "invalid" | "ok") {
  rememberCodingRuntime("local")
  rememberChatReadiness(buildChatReadiness({
    engines: [], localModels: [], apiKeys: [{ kind: "api_key", providerId: "prv_gw", presetId: "custom" }], engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: state === "invalid" ? { state: "invalid", code: "auth_rejected" } : { state: "ok" }
  } as never))
}
function fakeComposerDom(text: string) {
  const el = { value: text, getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
}

// ---------------- P2-2 ----------------

test("P2-2：上一台本地模型是 E2E Stub，换到 Amp 发一句 → 乐观助手泡底脚当场是「Amp」，不是「Amp · E2E Stub」", async () => {
  rememberAgentTools([ampTool()])
  idle("amp")
  fakeComposerDom("hello amp")
  await sendComposerMessage(undefined, "hello amp")
  await flush()
  delete (globalThis as any).document
  assert.equal(runInputs.length, 1, "发出去了")
  assert.equal(runInputs[0].modelId, "cli:amp")
  const bubble = [...useChatStore.getState().messages].reverse().find((m) => m.role === "assistant")!
  assert.equal(bubble.runtimeId, "amp")
  assert.equal(bubble.modelId, "cli:amp")
  assert.equal(bubble.modelLabel, undefined, "不盖上一台本地模型的标签")
  const footer = turnModelText({
    runtimeId: bubble.runtimeId, modelId: bubble.modelId, modelLabel: bubble.modelLabel, enjoyLocalLabel: "Enjoy",
    unknownEngineLabel: "模型服务", catalog: [{ id: "stub-e2e", label: "E2E Stub" }], tools: [{ id: "amp", label: "Amp" }]
  })
  assert.equal(footer, "Amp")
})

test("P2-2 对照：Enjoy 本地发一句，标签照旧盖（模型就是 store 那台）", async () => {
  keyReadiness("ok")
  idle("enjoy-local")
  fakeComposerDom("hello")
  await sendComposerMessage(undefined, "hello")
  await flush()
  delete (globalThis as any).document
  const bubble = [...useChatStore.getState().messages].reverse().find((m) => m.role === "assistant")!
  assert.equal(bubble.modelId, "stub-e2e")
  assert.equal(bubble.modelLabel, "E2E Stub")
})

// ---------------- 同会话再发 / jojo P3：main 拒发 ----------------

test("jojo P3：密钥被拒后渲染端「能发」还没刷新（闸放行），同会话再发被 main 拒（credential_invalid）→ 具名密钥卡 +「先改好密钥再发。」，稿回输入框", async () => {
  const { sessionId, runId } = inFlight("enjoy-local", "官方被拒")
  runError(sessionId, runId, "credential_invalid", { runtimeId: "enjoy-local", providerId: "prv_openai" })
  keyReadiness("ok") // 渲染端快照还停在「通过」
  runResult = { ok: false, code: "credential_invalid" }
  useChatStore.setState({ composer: "官方被拒" } as never)
  fakeComposerDom("官方被拒")
  await sendComposerMessage(undefined, "官方被拒")
  await flush()
  delete (globalThis as any).document
  assert.equal(runInputs.length, 1, "闸放行、main 拒掉")
  const st = useChatStore.getState()
  assert.equal(st.error, "credential_invalid", "仍是具名密钥卡")
  assert.equal(nudge.credentialSendBlocked(sessionId), true, "卡上补「先改好密钥再发。」")
  assert.equal(st.composer, "官方被拒", "稿回输入框")
  assert.equal(st.messages.filter((m) => m.role === "user" && m.content === "官方被拒").length, 0, "被拒那一句不留在对话里（字在输入框，不重复）")
})

test("jojo P3：落地页发的（建会话窗续发、带会话 id）被 main 拒 → 提醒也记在落地页名下", async () => {
  keyReadiness("ok")
  runResult = { ok: false, code: "credential_invalid" }
  const sessionId = idle("enjoy-local")
  await sendComposerMessage({ content: "first", sessionId, assets: [] })
  await flush()
  assert.equal(runInputs.length, 1)
  assert.equal(useChatStore.getState().error, "credential_invalid")
  assert.equal(nudge.credentialSendBlocked(sessionId), true)
  assert.equal(nudge.credentialSendBlocked(null), true)
})
