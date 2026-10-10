import assert from "node:assert/strict"
import { test } from "node:test"
import { rememberAgentTools } from "../agent-tools-cache.ts"
import {
  NEED_CLI_AUTHORIZING,
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_CLI_LOGIN_FAILED,
  NEED_CLI_OUTDATED,
  NEED_PROVIDER_KEY,
  NEED_REMOTE_CONNECTED,
  NO_CHAT_ROUTE
} from "../../lib/usage/classify-thread-error.ts"
import {
  resetCliLoginLoopStore,
  useCliLoginLoopStore
} from "../../components/ai-chat/agent-picker/cli-login-loop.ts"
import { composerSendReady, guardComposerSend } from "./send-composer-guard.ts"

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

test("本轮 enjoy-local 没密钥时回 no_chat_route，不是红错", () => {
  const chat = store({ runtimeId: "enjoy-local", hasKey: false })
  assert.equal(guardComposerSend(chat as never, { ideReady: true, chatReady: true }), false)
  assert.equal(chat.read().error, NO_CHAT_ROUTE)
  assert.equal(chat.read().picker, false)
})

test("Enjoy Local 有密钥但还没模型时也回 no_chat_route，禁止空按", () => {
  const chat = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "" })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NO_CHAT_ROUTE)
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

test("发送盘：Enjoy Local 无密钥不亮；CLI 未登录不亮", () => {
  rememberAgentTools([claudeTool(false)])
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: false, modelId: "m" }), false)
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "m" }), true)
  assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "" }), false)
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
  for (const status of ["connecting", "failed", "disconnected"] as const) {
    const chat = store({ runtimeId: "enjoy-local", hasKey: true })
    Object.assign(chat, { workspaceKind: "ssh", remoteStatus: status })
    assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
    assert.equal(chat.read().error, NEED_REMOTE_CONNECTED)
    assert.equal(composerSendReady({ runtimeId: "enjoy-local", hasKey: true, modelId: "m", workspaceKind: "ssh", remoteStatus: status }), false)
  }
  assert.equal(
    composerSendReady({
      runtimeId: "enjoy-local",
      hasKey: true,
      modelId: "m",
      workspaceKind: "ssh",
      remoteStatus: "connected"
    }),
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
