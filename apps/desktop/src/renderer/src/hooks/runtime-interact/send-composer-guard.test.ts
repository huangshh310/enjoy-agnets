import assert from "node:assert/strict"
import { test } from "node:test"
import { rememberAgentTools } from "../agent-tools-cache.ts"
import {
  NEED_CLI_AUTHORIZING,
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_CLI_LOGIN_FAILED,
  NEED_CLI_OUTDATED,
  NEED_MODEL,
  NEED_PROVIDER_KEY,
  NEED_REMOTE_CONNECTED,
  NO_CHAT_ROUTE
} from "../../lib/usage/classify-thread-error.ts"
import {
  resetCliLoginLoopStore,
  useCliLoginLoopStore
} from "../../components/ai-chat/agent-picker/cli-login-loop.ts"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { rememberChatReadiness, rememberCodingRuntime } from "../chat-readiness-cache.ts"
import { markModelsListed, resetModelsListed } from "../models-listed.ts"
import { composerSendReady, guardComposerSend } from "./send-composer-guard.ts"

function readyKey() {
  return buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "p", presetId: "openai" }],
    engineCount: 1
  })
}

function readyNone() {
  return buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [],
    engineCount: 1
  })
}

function readyLocal() {
  return buildChatReadiness({
    engines: [],
    localModels: [{ kind: "local_model", service: "ollama", verified: true }],
    apiKeys: [],
    engineCount: 1
  })
}

test.beforeEach(() => {
  rememberChatReadiness(undefined)
  rememberCodingRuntime("local")
  resetModelsListed()
  markModelsListed()
})

function store(partial: {
  runtimeId: string
  hasKey?: boolean
  modelId?: string
  workspaceId?: string | null
  sessionId?: string | null
}) {
  let error: string | null = null
  let picker = false
  return {
    runtimeId: partial.runtimeId,
    hasKey: partial.hasKey ?? false,
    modelId: partial.modelId ?? "m",
    workspaceId: partial.workspaceId === undefined ? "ws" : partial.workspaceId,
    sessionId: partial.sessionId === undefined ? "sess" : partial.sessionId,
    error,
    setError: (message: string | null) => {
      error = message
    },
    setAgentPickerOpen: (open: boolean) => {
      picker = open
    },
    read: () => ({ error, picker })
  }
}

test("无快照时 Enjoy Local 放行，Harness 也放行", () => {
  rememberChatReadiness(undefined)
  const noSnap = store({ runtimeId: "enjoy-local", hasKey: false, modelId: "m" })
  assert.equal(guardComposerSend(noSnap as never, { ideReady: true }), true)
  rememberCodingRuntime("harness")
  rememberChatReadiness(readyNone())
  const harness = store({ runtimeId: "enjoy-local", hasKey: false, modelId: "" })
  assert.equal(guardComposerSend(harness as never, { ideReady: true }), true)
})

test("本轮 enjoy-local 快照无路线时回 no_chat_route，不是红错", () => {
  rememberChatReadiness(readyNone())
  const chat = store({ runtimeId: "enjoy-local", hasKey: true })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NO_CHAT_ROUTE)
  assert.equal(chat.read().picker, false)
})

test("模型列表还在加载时不催 NEED_MODEL，发送盘也不亮", () => {
  resetModelsListed()
  rememberChatReadiness(readyKey())
  const loading = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "" })
  assert.equal(guardComposerSend(loading as never, { ideReady: true }), false)
  assert.equal(loading.read().error, null)
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "" }), false)
})

test("默认路线是 CLI、会话掉回 enjoy-local 时仍催选模型", () => {
  rememberChatReadiness(
    buildChatReadiness({
      engines: [{ kind: "engine", runtimeId: "claude", name: "Claude Code" }],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "e2e", presetId: "openai" }],
      engineCount: 1,
      preferredRuntimeId: "claude",
      hasEnjoySecret: true
    })
  )
  const chat = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "" })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_MODEL)
})

test("Enjoy Local 信共享闸；无快照放行；当前档案有密钥没模型单独提示", () => {
  rememberChatReadiness(readyKey())
  const keyed = store({ runtimeId: "enjoy-local", hasKey: false, modelId: "m" })
  assert.equal(guardComposerSend(keyed as never, { ideReady: true }), true)
  const noModel = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "" })
  assert.equal(guardComposerSend(noModel as never, { ideReady: true }), false)
  assert.equal(noModel.read().error, NEED_MODEL)
  assert.equal(noModel.read().picker, false)
  rememberChatReadiness(undefined)
  const noSnap = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "m" })
  assert.equal(guardComposerSend(noSnap as never, { ideReady: true }), true)
})

test("当前档案没密钥、另一份启用档案有密钥：不催选模型，闸拦发送", () => {
  rememberChatReadiness(
    buildChatReadiness({
      engines: [],
      localModels: [],
      apiKeys: [{ kind: "api_key", providerId: "other", presetId: "openai" }],
      engineCount: 1,
      hasEnjoySecret: false,
      activeKeyProfileId: null
    })
  )
  const chat = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "" })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NO_CHAT_ROUTE)
  assert.equal(chat.read().picker, false)
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "" }), false)
})

test("已装未登录 CLI 打开 Picker，不打 agent.run", () => {
  rememberAgentTools([
    {
      id: "claude",
      label: "Claude",
      transport: "acp-host",
      binaries: ["claude"],
      acpArgs: ["acp"],
      needsLoginHint: "",
      available: true,
      comingSoon: false,
      skillOnly: false,
      enabled: true,
      detectedPath: "/bin/claude",
      version: null,
      status: "ready",
      models: [],
      installKind: "npm",
      installCommand: "",
      docsUrl: "",
      useCustomProvider: false,
      supportedApiStyles: [],
      authAccount: { loggedIn: false },
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
    }
  ])
  const chat = store({ runtimeId: "claude", hasKey: true })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_CLI_LOGIN)
  assert.equal(chat.read().picker, true)
})

function claudeTool(loggedIn: boolean | null) {
  return {
    id: "claude",
    label: "Claude",
    transport: "acp-host" as const,
    binaries: ["claude"],
    acpArgs: ["acp"],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: "/bin/claude",
    version: null,
    status: "ready" as const,
    models: [],
    installKind: "npm" as const,
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    supportedApiStyles: [],
    authAccount: loggedIn === null ? undefined : { loggedIn },
    capabilities: {
      spawn: true,
      models: "catalog" as const,
      login: true,
      quota: false,
      thinking: "none" as const,
      fast: "none" as const,
      permissionUi: "enjoy-hmac" as const,
      executionModes: "hidden" as const,
      slash: "hidden" as const,
      resumeFork: false,
      compact: "cli" as const,
      askUser: "hidden" as const,
      steer: true,
      realtime: false,
      delegate: false,
      providerBind: "none" as const
    }
  }
}

test("检测中不打开 Picker，也不当成未登录", () => {
  rememberAgentTools([claudeTool(null)])
  const chat = store({ runtimeId: "claude", hasKey: true })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_CLI_INSPECTING)
  assert.equal(chat.read().picker, false)
})

test("发送盘：Enjoy Local 只信快照，不信 hasKey；CLI 未登录不亮", () => {
  rememberAgentTools([claudeTool(false)])
  rememberChatReadiness(readyNone())
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "m" }), false)
  rememberChatReadiness(readyKey())
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: false, modelId: "m" }), true)
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: false, modelId: "" }), false)
  rememberChatReadiness(readyLocal())
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: false, modelId: "" }), true)
  rememberChatReadiness(undefined)
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "m" }), true)
  assert.equal(composerSendReady({ runtimeId: "claude", hasKey: true, modelId: "m" }), false)
})

test("发送盘：已登录 CLI 才亮", () => {
  rememberAgentTools([claudeTool(true)])
  assert.equal(composerSendReady({ runtimeId: "claude", hasKey: true, modelId: "m" }), true)
})

test("绑了 Enjoy 档案：没登官方也能发，缺 Key 才拦", () => {
  const bound = {
    ...claudeTool(false),
    useCustomProvider: true,
    providerId: "prv_1",
    boundHasKey: true,
    capabilities: { ...claudeTool(false).capabilities, providerBind: "anthropic" as const }
  }
  rememberAgentTools([bound])
  assert.equal(composerSendReady({ runtimeId: "claude", hasKey: true, modelId: "deepseek-flash" }), true)
  const chat = store({ runtimeId: "claude", hasKey: true, modelId: "deepseek-flash" })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), true)

  rememberAgentTools([{ ...bound, boundHasKey: false }])
  const noKey = store({ runtimeId: "claude", hasKey: true, modelId: "deepseek-flash" })
  assert.equal(guardComposerSend(noKey as never, { ideReady: true }), false)
  assert.equal(noKey.read().error, NEED_PROVIDER_KEY)
  assert.equal(noKey.read().picker, false)
})

test("发送盘：缓存里还没有 CLI 行时不亮", () => {
  rememberAgentTools([])
  assert.equal(composerSendReady({ runtimeId: "cursor", hasKey: true, modelId: "m" }), false)
})

test("缓存里还没有 CLI 行时也是检测中", () => {
  rememberAgentTools([])
  const chat = store({ runtimeId: "cursor", hasKey: true })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_CLI_INSPECTING)
  assert.equal(chat.read().picker, false)
})

function officialTool(id: "cursor" | "grok" | "antigravity" | "amp", loggedIn: boolean | null) {
  return { ...claudeTool(loggedIn), id, label: id }
}

test("仅官方四家：检测中 / 授权中不能发，也不开登录坞", () => {
  resetCliLoginLoopStore()
  for (const id of ["cursor", "grok", "antigravity", "amp"] as const) {
    rememberAgentTools([officialTool(id, null)])
    const inspecting = store({ runtimeId: id, hasKey: true })
    assert.equal(composerSendReady({ runtimeId: id, hasKey: true, modelId: "m" }), false)
    assert.equal(guardComposerSend(inspecting as never, { ideReady: true }), false)
    assert.equal(inspecting.read().error, NEED_CLI_INSPECTING)
    assert.equal(inspecting.read().picker, false)

    rememberAgentTools([officialTool(id, false)])
    useCliLoginLoopStore.getState().begin(id)
    const authorizing = store({ runtimeId: id, hasKey: true })
    assert.equal(composerSendReady({ runtimeId: id, hasKey: true, modelId: "m" }), false)
    assert.equal(guardComposerSend(authorizing as never, { ideReady: true }), false)
    assert.equal(authorizing.read().error, NEED_CLI_AUTHORIZING)
    assert.equal(authorizing.read().picker, false)
    useCliLoginLoopStore.getState().succeed(id)
  }
  resetCliLoginLoopStore()
})

test("已登录但版本过旧：不能发，也不开登录坞", () => {
  rememberAgentTools([
    {
      ...claudeTool(true),
      id: "cursor",
      label: "Cursor",
      version: "1.2",
      requiredVersion: "1.5",
      authAccount: { loggedIn: true, cliVersion: "1.2" }
    }
  ])
  const chat = store({ runtimeId: "cursor", hasKey: true })
  assert.equal(composerSendReady({ runtimeId: "cursor", hasKey: true, modelId: "m" }), false)
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_CLI_OUTDATED)
  assert.equal(chat.read().picker, false)
})

test("SSH connecting|failed|disconnected 时 guardComposerSend 为 false", () => {
  rememberAgentTools([])
  rememberChatReadiness(readyKey())
  for (const status of ["connecting", "failed", "disconnected"] as const) {
    const chat = store({ runtimeId: "enjoy-local", hasKey: true })
    Object.assign(chat, { workspaceKind: "ssh", remoteStatus: status })
    assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
    assert.equal(chat.read().error, NEED_REMOTE_CONNECTED)
    assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "m", workspaceKind: "ssh", remoteStatus: status }), false)
  }
  assert.equal(
    composerSendReady(
      {
        runtimeId: "enjoy-local",
        hasKey: true,
        modelId: "m",
        workspaceKind: "ssh",
        remoteStatus: "connected"
      },
    ),
    true
  )
})

test("仅官方登录失败：不能发，打开 Picker 重试", () => {
  resetCliLoginLoopStore()
  rememberAgentTools([officialTool("amp", false)])
  useCliLoginLoopStore.getState().fail("amp", "callback_timeout")
  const chat = store({ runtimeId: "amp", hasKey: true })
  assert.equal(composerSendReady({ runtimeId: "amp", hasKey: true, modelId: "m" }), false)
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_CLI_LOGIN_FAILED)
  assert.equal(chat.read().picker, true)
  resetCliLoginLoopStore()
})
