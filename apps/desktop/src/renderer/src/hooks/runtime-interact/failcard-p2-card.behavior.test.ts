/**
 * luna 巡检 P2-1（渲染端）。真走 dispatchAgentEvent（run.error 出字前回滚）/ sendComposerMessage（发送闸清路线），
 * 卡的称呼 / 「改密钥」去哪按 useSendFailureTarget 同一条链（会话记下的路线 → sendFailureTarget）算。
 * - P2-1：失败卡说谁、「改密钥」开哪份 = 这一轮实际走的（run.error 带回的 runtimeId / providerId），
 *   不是 defaultProviderFace 退到的列表第一份带钥档案；免密钥的 Ollama 说 Ollama、不给改密钥。
 * P2-2 / jojo P3 见 failcard-p2-send.behavior.test。
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
const { rememberChatReadiness } = await import("../chat-readiness-cache.ts")
const nudge = await import("../credential-send-nudge.ts")
const pending = await import("../pending-failed-send.ts")
const queue = await import("../followup-queue.ts")
const route = await import("../send-failure-route.ts")
const { sendFailureTarget } = await import("../../lib/send-failure-target.ts")
const { fixKeyTargetNavigation } = await import("../../components/ai-chat/thread/credential-fix-key-nav.ts")
const { resetClientRequestIdForTest } = await import("./client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")

const flush = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0)) }

afterEach(() => {
  runInputs.length = 0
  runResult = { ok: true, runId: "run_ok" }
  nudge.resetCredentialSendNudgeForTest()
  pending.resetPendingFailedSendForTest()
  queue.resetFollowupsForTest()
  route.resetSendFailureRoutesForTest()
  resetClientRequestIdForTest()
  resetComposerRunningOwnerForTest()
  rememberChatReadiness(undefined)
  rememberAgentTools([])
})

// 设置里的档案：My Gateway 在列表第一份（带钥、不是当前），Work key A（OpenAI 官方）是当前，E2E Stub 是免密钥 Ollama。
const gateway = { id: "prv_gw", name: "My Gateway", kind: "custom", baseURL: "https://gw.example.net/v1", enabled: true, active: false, requiresKey: true }
const openai = { id: "prv_openai", name: "Work key A", kind: "openai", baseURL: "", enabled: true, active: true, requiresKey: true }
const ollama = { id: "prv_ollama", name: "E2E Stub", kind: "ollama", baseURL: "", enabled: true, active: false, requiresKey: false }
const providers = [gateway, openai, ollama]

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
/** 卡此刻怎么说（与 useSendFailureTarget 同一条链：会话记下的路线 → sendFailureTarget）。 */
function card(sessionId: string, tools: any[] = []) {
  return sendFailureTarget({
    route: route.sendFailureRouteFor(sessionId),
    runtimeId: useChatStore.getState().runtimeId,
    tools,
    displayNames: {},
    providers
  })
}
function fakeComposerDom(text: string) {
  const el = { value: text, getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null) }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
}

// ---------------- P2-1 ----------------

test("P2-1：OpenAI 那一轮 401 → 卡说 OpenAI、「改密钥」开 OpenAI 那份（不是列表第一份 My Gateway）", () => {
  const { sessionId, runId } = inFlight("enjoy-local", "hi")
  runError(sessionId, runId, "credential_invalid", { runtimeId: "enjoy-local", providerId: "prv_openai" })
  assert.equal(useChatStore.getState().error, "credential_invalid")
  assert.deepEqual(route.sendFailureRouteFor(sessionId), { runtimeId: "enjoy-local", providerId: "prv_openai" })
  const target = card(sessionId)
  assert.deepEqual(target.face, { kind: "named", name: "OpenAI" })
  assert.deepEqual(target.fixKey, { kind: "provider", providerId: "prv_openai" })
  assert.deepEqual(fixKeyTargetNavigation(target.fixKey!), { to: "/settings/$section", params: { section: "providers" }, search: { edit: "prv_openai", from: "chat" } })
})

test("P2-1：免密钥 Ollama 那一轮连不上 → 卡说 Ollama（不是「模型服务」）、不给「改密钥」；没记下路线时按当前档案同样如此", () => {
  const { sessionId, runId } = inFlight("enjoy-local", "hi")
  runError(sessionId, runId, "provider_unreachable", { runtimeId: "enjoy-local", providerId: "prv_ollama" })
  const target = card(sessionId)
  assert.deepEqual(target.face, { kind: "named", name: "Ollama" })
  assert.equal(target.fixKey, null)
  const fallback = sendFailureTarget({ route: null, runtimeId: "enjoy-local", tools: [], displayNames: {}, providers: providers.map((p) => ({ ...p, active: p.id === "prv_ollama" })) })
  assert.deepEqual(fallback.face, { kind: "named", name: "Ollama" })
  assert.equal(fallback.fixKey, null)
})

test("P2-1：Amp 那一轮被拒 → 卡说 Amp；没绑档案「改密钥」开 Amp 自己的设置卡，绑了开绑的那份——都不是 My Gateway", () => {
  const tools = [{ id: "amp", label: "Amp" }]
  const a = inFlight("amp", "hi")
  runError(a.sessionId, a.runId, "credential_invalid", { runtimeId: "amp" })
  const unbound = card(a.sessionId, tools)
  assert.deepEqual(unbound.face, { kind: "named", name: "Amp" })
  assert.deepEqual(unbound.fixKey, { kind: "agent", toolId: "amp" })
  assert.deepEqual(fixKeyTargetNavigation(unbound.fixKey!), { to: "/settings/$section", params: { section: "agent" }, search: { tool: "amp" } })
  const b = inFlight("amp", "hi")
  runError(b.sessionId, b.runId, "credential_invalid", { runtimeId: "amp", providerId: "prv_openai" })
  assert.deepEqual(card(b.sessionId, tools).fixKey, { kind: "provider", providerId: "prv_openai" })
})

test("P2-1：路线按会话记，别的会话的失败不串；新一发过闸就清掉（回落这一发会用的当前档案）", async () => {
  const a = inFlight("enjoy-local", "hi")
  runError(a.sessionId, a.runId, "credential_invalid", { runtimeId: "enjoy-local", providerId: "prv_gw" })
  const b = inFlight("enjoy-local", "hi")
  assert.equal(route.sendFailureRouteFor(b.sessionId), null)
  runError(b.sessionId, b.runId, "credential_invalid", { runtimeId: "enjoy-local", providerId: "prv_openai" })
  assert.deepEqual(route.sendFailureRouteFor(a.sessionId), { runtimeId: "enjoy-local", providerId: "prv_gw" })
  // b 再发一句（过闸）：b 的路线清掉，a 的不动。
  useChatStore.setState({ running: false, runId: null, error: null } as never)
  fakeComposerDom("again")
  await sendComposerMessage(undefined, "again")
  await flush()
  assert.equal(route.sendFailureRouteFor(b.sessionId), null)
  assert.deepEqual(route.sendFailureRouteFor(a.sessionId), { runtimeId: "enjoy-local", providerId: "prv_gw" })
  delete (globalThis as any).document
})

test("同会话再发被 main 拒（密钥）：卡仍说这一发会用的当前档案（OpenAI），不是 My Gateway", () => {
  const { sessionId, runId } = inFlight("enjoy-local", "hi")
  runError(sessionId, runId, "credential_invalid", { runtimeId: "enjoy-local", providerId: "prv_openai" })
  route.clearSendFailureRoute(sessionId) // 再发过闸时清掉路线（send-composer-run）
  assert.deepEqual(card(sessionId).face, { kind: "named", name: "OpenAI" })
  assert.deepEqual(card(sessionId).fixKey, { kind: "provider", providerId: "prv_openai" })
})
