/**
 * chat.readiness：可对话路线真源。入参空对象，回快照；变更另推同频道。
 */
import { ChatReadinessInput } from "@enjoy-agents/ipc-contract/chat-readiness"
import { ipcMain } from "electron"
import { computeChatReadiness } from "./services/chat-readiness"

export const CHAT_READINESS_CHANNELS = ["chat.readiness"] as const

export function registerChatReadinessIpc() {
  ipcMain.handle("chat.readiness", async (_event, raw) => {
    ChatReadinessInput.parse(raw ?? {})
    return computeChatReadiness()
  })
}
