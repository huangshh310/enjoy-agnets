/**
 * 可对话路线快照缓存。发送闸读这里，避免测试拉进 ide / react-query。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

let last: ChatReadiness | undefined

export function rememberChatReadiness(snapshot: ChatReadiness | undefined): void {
  last = snapshot
}

export function peekChatReady(): boolean | undefined {
  return last?.ready
}

export function peekEngineCount(): number | undefined {
  return last?.engineCount
}
