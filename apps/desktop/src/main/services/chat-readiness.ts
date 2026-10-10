/**
 * 可对话路线真源：向导末屏、默认路线与发送闸。
 * 发送闸读 hasSecret()；ping 失败只驱动向导，不拦发送。
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
import { isSecretStorageAvailable } from "./secret-storage.ts"
import { hasSecret, listPublicProviders } from "./secrets"

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

export async function computeChatReadiness(): Promise<ChatReadiness> {
  const packaged = app.isPackaged
  try {
    await seedE2eChatReadyRoute({
      packaged,
      userData: app.getPath("userData")
    })
  } catch {
    // 夹具种档案失败仍走快照，避免向导空白。
  }
  const enjoySecret = await hasSecret().catch(() => undefined)
  const fixture = e2eChatReadiness(process.env, packaged)
  if (fixture) {
    return rememberSnapshot(withSecretAndAdopt(fixture, enjoySecret, true))
  }
  const [tools, providers, live] = await Promise.all([
    listAgentTools(),
    listPublicProviders(),
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
    { ...defaultChatRouteAssembleInput(), hasEnjoySecret: enjoySecret }
  )
  return rememberSnapshot(
    withSecretAndAdopt(snapshot, enjoySecret, chatRouteProbesSettled(listed))
  )
}

function chatRouteProbesSettled(tools: readonly { id: string; status?: string }[]): boolean {
  return !tools.some(
    (tool) => tool.id !== "enjoy-local" && tool.status === "ready" && inspectLoggedIn(tool.id) === "miss"
  )
}

function withSecretAndAdopt(
  snapshot: ChatReadiness,
  enjoySecret: boolean | undefined,
  probesSettled: boolean
): ChatReadiness {
  const withSecret =
    enjoySecret === undefined ? snapshot : { ...snapshot, hasEnjoySecret: enjoySecret }
  const withStorage = { ...withSecret, secretStorageAvailable: isSecretStorageAvailable() }
  const adopted = persistAdoptedDefaultRoute(withStorage, { probesSettled })
  return adopted.hint ? { ...withStorage, adoptedHint: adopted.hint } : withStorage
}

function rememberSnapshot(snapshot: ChatReadiness): ChatReadiness {
  cached = snapshot
  return snapshot
}

export function emitChatReadiness(snapshot: ChatReadiness): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("chat.readiness", snapshot)
  }
}

/** 存密钥后立刻算新快照，renderer 解开回包时 peek 才不是旧的。 */
export async function pushChatReadinessNow(): Promise<ChatReadiness> {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = undefined
  }
  const snapshot = await computeChatReadiness()
  emitChatReadiness(snapshot)
  return snapshot
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
