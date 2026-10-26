/**
 * #175 soft（合入后）：
 * 1. 过闸清路线——闸**拦下**也清（放行路径已在 failcard-p2-card 盖）；清掉后卡回落当前档案。
 * 2. 继续待办 / 重新生成：乐观助手泡 stamp 跟这一发 agent.run 的 modelId（与发送同改），
 *    换到 Amp 后底脚当场是「Amp」，不是上一台本地「Amp · E2E Stub」。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

const memory = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k)
}
const runInputs: any[] = []
let runResult: unknown = { ok: true, runId: "run_ok" }
function bridge(path: string): any {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: (_t, _th, args) => {
      if (/\.on[A-Z]\w*$/.test(path)) return () => undefined
      if (path === ".agent.run") {
        runInputs.push(args[0])
        return Promise.resolve(typeof runResult === "function" ? (runResult as any)(...args) : runResult)
      }
      if (path === ".session.drafts.loadSync" || path === ".session.drafts.loadAssetsSync") return {}
      return Promise.resolve(path.endsWith(".list") || path === ".session.messages" ? [] : undefined)
    }
  })
}
;(globalThis as any).window = { ide: bridge("") }

const { useChatStore } = await import("../../stores/chat-store.ts")
const { sendComposerMessage } = await import("./send-composer-run.ts")
const { continueTodoTurn } = await import("../continue-todo-turn.ts")
const { regenerateAssistantTurn } = await import("../regenerate-turn.ts")
const { dispatchAgentEvent } = await import("../../stores/attention/dispatch-agent-event.ts")
const { rememberAgentTools } = await import("../agent-tools-cache.ts")
const { rememberChatReadiness, rememberCodingRuntime } = await import("../chat-readiness-cache.ts")
const { buildChatReadiness } = await import("@enjoy-agents/ipc-contract/chat-readiness")
const { turnModelText } = await import("../../lib/turn-model-text.ts")
const nudge = await import("../credential-send-nudge.ts")
const pending = await import("../pending-failed-send.ts")
const queue = await import("../followup-queue.ts")
const route = await import("../send-failure-route.ts")
const { sendFailureTarget } = await import("../../lib/send-failure-target.ts")
const { resetClientRequestIdForTest } = await import("./client-request-id.ts")
const { resetComposerRunningOwnerForTest } = await import("./composer-running-owner.ts")

const flush = async () => {
  for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0))
}

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

const gateway = {
  id: "prv_gw",
  name: "My Gateway",
  kind: "custom",
  baseURL: "https://gw.example.net/v1",
  enabled: true,
  active: false,
  requiresKey: true
}
const openai = {
  id: "prv_openai",
  name: "Work key A",
  kind: "openai",
  baseURL: "",
  enabled: true,
  active: true,
  requiresKey: true
}
const providers = [gateway, openai]

let seq = 0
function idle(runtimeId: string, extra: Record<string, unknown> = {}) {
  seq += 1
  const sessionId = `ses_soft_${seq}`
  useChatStore.setState({
    workspaceId: "ws",
    sessionId,
    running: false,
    runId: null,
    composer: "",
    error: null,
    notice: null,
    pendingApproval: null,
    hasKey: true,
    modelId: "stub-e2e",
    modelLabel: "E2E Stub",
    runtimeId,
    pendingStreamEvents: [],
    preparingHint: false,
    preparingSessionId: null,
    sessionModels: {},
    messages: [
      { id: "u0", role: "user", content: "更早一轮", createdAt: 1 },
      { id: "a0", role: "assistant", content: "好的", createdAt: 2 }
    ],
    ...extra
  } as never)
  return sessionId
}

function inFlight(runtimeId: string, text: string) {
  const runId = `run_soft_${seq + 1}`
  const sessionId = idle(runtimeId, {
    running: true,
    runId,
    messages: [
      { id: "u1", role: "user", content: text, createdAt: 1 },
      { id: "a1", role: "assistant", content: "", createdAt: 2, streaming: true }
    ]
  })
  return { sessionId, runId }
}

function runError(sessionId: string, runId: string, code: string, routeFields: Record<string, string>) {
  dispatchAgentEvent({
    type: "run.error",
    runId,
    sessionId,
    message: code,
    code,
    preOutput: true,
    ...routeFields
  } as never)
}

function keyReadiness(state: "invalid" | "ok") {
  rememberCodingRuntime("local")
  rememberChatReadiness(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "prv_openai", presetId: "openai" }],
      engineCount: 1,
      hasEnjoySecret: true,
      credentialCheck: state === "invalid" ? { state: "invalid", code: "auth_rejected" } : { state: "ok" }
    } as never)
  )
}

function fakeComposerDom(text: string) {
  const el = {
    value: text,
    getAttribute: (k: string) => (k === "data-testid" ? "composer-input" : null)
  }
  ;(globalThis as any).document = { activeElement: el, querySelector: () => el }
}

function ampTool() {
  return {
    id: "amp",
    label: "Amp",
    transport: "acp-host",
    binaries: ["amp"],
    acpArgs: [],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: "/bin/amp",
    version: null,
    status: "ready",
    models: [],
    installKind: "npm",
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    providerId: undefined,
    supportedApiStyles: [],
    authAccount: { loggedIn: true },
    capabilities: {
      spawn: true,
      models: "catalog",
      login: true,
      quota: false,
      thinking: "none",
      fast: "none",
      permissionUi: "enjoy-hmac",
      executionModes: "hidden",
      slash: "hidden",
      resumeFork: false,
      compact: "cli",
      askUser: "hidden",
      steer: true,
      realtime: false,
      delegate: false,
      providerBind: "none"
    }
  } as never
}

function ampFooter(bubble: { runtimeId?: string; modelId?: string; modelLabel?: string }) {
  return turnModelText({
    runtimeId: bubble.runtimeId,
    modelId: bubble.modelId,
    modelLabel: bubble.modelLabel,
    enjoyLocalLabel: "Enjoy",
    unknownEngineLabel: "模型服务",
    catalog: [{ id: "stub-e2e", label: "E2E Stub" }],
    tools: [{ id: "amp", label: "Amp" }]
  })
}

// ---------------- soft 1：闸拦也清路线 ----------------

test("soft：上一轮失败记下路线后，新一发被密钥闸拦下 → 路线仍清掉；卡回落当前档案（OpenAI），不是上一轮 My Gateway", async () => {
  const { sessionId, runId } = inFlight("enjoy-local", "hi")
  runError(sessionId, runId, "credential_invalid", {
    runtimeId: "enjoy-local",
    providerId: "prv_gw"
  })
  assert.deepEqual(route.sendFailureRouteFor(sessionId), {
    runtimeId: "enjoy-local",
    providerId: "prv_gw"
  })
  keyReadiness("invalid")
  useChatStore.setState({ running: false, runId: null } as never)
  fakeComposerDom("again")
  await sendComposerMessage(undefined, "again")
  await flush()
  delete (globalThis as any).document
  assert.equal(runInputs.length, 0, "闸拦：没发出去")
  assert.equal(useChatStore.getState().error, "credential_invalid")
  assert.equal(route.sendFailureRouteFor(sessionId), null, "被拦也清路线")
  const target = sendFailureTarget({
    route: route.sendFailureRouteFor(sessionId),
    runtimeId: useChatStore.getState().runtimeId,
    tools: [],
    displayNames: {},
    providers
  })
  assert.deepEqual(target.face, { kind: "named", name: "OpenAI" })
  assert.deepEqual(target.fixKey, { kind: "provider", providerId: "prv_openai" })
})

// ---------------- soft 2：继续 / 重新生成 stamp ----------------

test("soft：换到 Amp 后续跑 Todo → 乐观助手泡 runtimeId/modelId 是 Amp（cli:amp），底脚「Amp」不是「Amp · E2E Stub」", async () => {
  rememberAgentTools([ampTool()])
  idle("amp", {
    messages: [
      { id: "u1", role: "user", content: "做个 todo", createdAt: 1 },
      { id: "a1", role: "assistant", content: "计划如下", createdAt: 2 }
    ]
  })
  await continueTodoTurn()
  await flush()
  assert.equal(runInputs.length, 1, "续跑发出去了")
  assert.equal(runInputs[0].modelId, "cli:amp")
  const bubble = [...useChatStore.getState().messages].reverse().find((m) => m.role === "assistant")!
  assert.equal(bubble.runtimeId, "amp")
  assert.equal(bubble.modelId, "cli:amp")
  assert.equal(bubble.modelLabel, undefined, "不盖上一台本地模型的标签")
  assert.equal(ampFooter(bubble), "Amp")
})

test("soft：换到 Amp 后重新生成 → 乐观助手泡 runtimeId/modelId 是 Amp（cli:amp），底脚「Amp」不是「Amp · E2E Stub」", async () => {
  rememberAgentTools([ampTool()])
  idle("amp", {
    messages: [
      { id: "u1", role: "user", content: "帮我写个排序", createdAt: 1 },
      { id: "a1", role: "assistant", content: "旧答", createdAt: 2 }
    ]
  })
  await regenerateAssistantTurn("a1")
  await flush()
  assert.equal(runInputs.length, 1, "重新生成发出去了")
  assert.equal(runInputs[0].modelId, "cli:amp")
  const bubble = [...useChatStore.getState().messages].reverse().find((m) => m.role === "assistant")!
  assert.equal(bubble.runtimeId, "amp")
  assert.equal(bubble.modelId, "cli:amp")
  assert.equal(bubble.modelLabel, undefined, "不盖上一台本地模型的标签")
  assert.equal(ampFooter(bubble), "Amp")
})
