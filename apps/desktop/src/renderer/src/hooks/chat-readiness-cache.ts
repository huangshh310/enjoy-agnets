/**
 * 可对话路线快照缓存。发送闸读这里，避免测试拉进 ide / react-query。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"

let last: ChatReadiness | undefined
let codingRuntime: "local" | "harness" = "local"

export function rememberChatReadiness(snapshot: ChatReadiness | undefined): void {
  last = snapshot
}

export function rememberCodingRuntime(next: "local" | "harness" | undefined): void {
  codingRuntime = next === "harness" ? "harness" : "local"
}

export function peekCodingRuntime(): "local" | "harness" {
  return codingRuntime
}

export function peekChatReady(): boolean | undefined {
  return last?.ready
}

export function peekChatReadiness(): ChatReadiness | undefined {
  return last
}

export function peekDefaultChatRoute(): ChatReadiness["defaultRoute"] {
  return last?.defaultRoute
}

export function peekEngineCount(): number | undefined {
  return last?.engineCount
}
