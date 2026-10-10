/**
 * 可对话路线真源：向导末屏、默认路线与发送闸共用同一套判断。
 * 发送闸读缓存的分路结果，不同步等 ping。
 */
import { app, BrowserWindow } from "electron"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { isVerifiedLocalModel } from "@enjoy-agents/ipc-contract/chat-readiness"
import { listAgentTools } from "./agent-tools-service"
import { readInspectCache } from "./agent-tools-account/inspect-store"
import { assembleChatReadiness, pingLocalModelServices } from "./chat-readiness-assemble"
import { defaultChatRouteAssembleInput, persistAdoptedDefaultRoute } from "./default-chat-route"
import { e2eChatReadiness } from "./e2e-chat-readiness"
import { seedE2eChatReadyRoute } from "./e2e-chat-ready-seed"
import { isE2eStub } from "./e2e-stub"
import { listPublicProviders } from "./secrets"

export { assembleChatReadiness, pingLocalModelServices } from "./chat-readiness-assemble"

const PUSH_DEBOUNCE_MS = 120

let cached: ChatReadiness | undefined
let lastLoggedIn = new Set<string>()
let pushTimer: ReturnType<typeof setTimeout> | undefined

export function peekCachedChatReadiness(): ChatReadiness | undefined {
  return cached
}

/** 发送闸读缓存：有 ping 通过的本机模型。从未算过 = unknown。 */
export function peekVerifiedLocalModel(): boolean | "unknown" {
  if (!cached) return "unknown"
  return cached.localModels.some(isVerifiedLocalModel)
}

/** 发送闸读缓存：有 requiresKey 的已存密钥。不是 hasSecret（ollama 无密钥也是 true）。 */
export function peekHasEnjoyApiKey(): boolean | "unknown" {
  if (!cached) return "unknown"
  return cached.apiKeys.length > 0
}

export async function computeChatReadiness(): Promise<ChatReadiness> {
  const packaged = app.isPackaged
  try {
    await seedE2eChatReadyRoute(packaged)
  } catch {
    // 夹具种档案失败仍走快照，避免向导空白。
  }
  const fixture = e2eChatReadiness(process.env, packaged)
  if (fixture) {
    persistAdoptedDefaultRoute(fixture)
    cached = fixture
    return fixture
  }
  const [tools, providers, live] = await Promise.all([
    listAgentTools(),
    listPublicProviders(),
    // e2e 显式注入本机路线，不放宽生产组装（已启用档案 ≠ ping 通过）。
    isE2eStub() ? Promise.resolve(["ollama"] as Array<"ollama" | "lmstudio">) : pingLocalModelServices()
  ])
  const listed = tools.map((tool) => ({
    id: tool.id,
    status: tool.status,
    name: tool.label,
    skillOnly: tool.skillOnly,
    comingSoon: tool.comingSoon
  }))
  const snapshot = assembleChatReadiness(
    listed,
    providers,
    live,
    loggedInToolIds(listed),
    defaultChatRouteAssembleInput()
  )
  persistAdoptedDefaultRoute(snapshot)
  cached = snapshot
  return snapshot
}

export function emitChatReadiness(snapshot: ChatReadiness): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("chat.readiness", snapshot)
  }
}

/** 连续 inspect / detect 合并成一次推送。 */
export function scheduleChatReadinessPush(): void {
  if (pushTimer) return
  pushTimer = setTimeout(() => {
    pushTimer = undefined
    void computeChatReadiness()
      .then((snapshot) => emitChatReadiness(snapshot))
      .catch(() => undefined)
  }, PUSH_DEBOUNCE_MS)
}

export function loggedInToolIds(tools: readonly { id: string }[]): Set<string> {
  const next = new Set<string>()
  for (const tool of tools) {
    const cachedLogin = inspectLoggedIn(tool.id)
    if (cachedLogin === true) next.add(tool.id)
    else if (cachedLogin === "miss" && lastLoggedIn.has(tool.id)) next.add(tool.id)
  }
  lastLoggedIn = next
  return next
}

function inspectLoggedIn(id: string): boolean | "miss" {
  try {
    const row = readInspectCache(id as never)
    if (!row) return "miss"
    return row.value.authAccount?.loggedIn === true
  } catch {
    return "miss"
  }
}
