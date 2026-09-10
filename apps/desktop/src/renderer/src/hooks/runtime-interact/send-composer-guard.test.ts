import assert from "node:assert/strict"
import { test } from "node:test"
import { rememberAgentTools } from "../agent-tools-cache.ts"
import {
  NEED_CLI_INSPECTING,
  NEED_CLI_LOGIN,
  NEED_PROVIDER_KEY
} from "../../lib/usage/classify-thread-error.ts"
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

test("Enjoy Local 无密钥留在 Chat，不假装能发", () => {
  const chat = store({ runtimeId: "enjoy-local", hasKey: false })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, NEED_PROVIDER_KEY)
  assert.equal(chat.read().picker, false)
})

test("Enjoy Local 有密钥但还没模型时不打 agent.run", () => {
  const chat = store({ runtimeId: "enjoy-local", hasKey: true, modelId: "" })
  assert.equal(guardComposerSend(chat as never, { ideReady: true }), false)
  assert.equal(chat.read().error, null)
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
