/**
 * 可对话路线真源：向导末屏与无密钥发送闸共用。
 * 引擎数 ≠ 可以开始；enjoy-local 没连模型不算 ready。
 */
import { BrowserWindow } from "electron"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { listAgentTools } from "./agent-tools-service"
import { readInspectCache } from "./agent-tools-account/inspect-store"
import { assembleChatReadiness, pingLocalModelServices } from "./chat-readiness-assemble"
import { listPublicProviders } from "./secrets"

export { assembleChatReadiness, pingLocalModelServices } from "./chat-readiness-assemble"

export async function computeChatReadiness(): Promise<ChatReadiness> {
  const [tools, providers, live] = await Promise.all([
    listAgentTools(),
    listPublicProviders(),
    pingLocalModelServices()
  ])
  const listed = tools.map((tool) => ({
    id: tool.id,
    status: tool.status,
    name: tool.label,
    skillOnly: tool.skillOnly,
    comingSoon: tool.comingSoon
  }))
  return assembleChatReadiness(listed, providers, live, loggedInToolIds(listed))
}

export function emitChatReadiness(snapshot: ChatReadiness): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("chat.readiness", snapshot)
  }
}

export function scheduleChatReadinessPush(): void {
  void computeChatReadiness()
    .then((snapshot) => emitChatReadiness(snapshot))
    .catch(() => undefined)
}

export function loggedInToolIds(tools: readonly { id: string }[]): Set<string> {
  const loggedIn = new Set<string>()
  for (const tool of tools) {
    if (inspectLoggedIn(tool.id)) loggedIn.add(tool.id)
  }
  return loggedIn
}

function inspectLoggedIn(id: string): boolean {
  try {
    return readInspectCache(id as never)?.value.authAccount?.loggedIn === true
  } catch {
    return false
  }
}
