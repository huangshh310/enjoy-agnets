/**
 * 从最近助手轮抽出引用与工具，供检查器使用。
 */
import type { CitedSource, ThreadToolCall } from "@enjoy-agents/ipc-contract"

export type SliceMessage = {
  role: string
  sources?: CitedSource[]
  tools?: ThreadToolCall[]
}

export function citedSourcesFromMessages(messages: SliceMessage[], limit = 5): CitedSource[] {
  return messages
    .slice(-4)
    .flatMap((message) => (message.role === "assistant" ? (message.sources ?? []) : []))
    .slice(0, limit)
}

export function toolsFromMessages(messages: SliceMessage[], limit = 8): ThreadToolCall[] {
  return messages
    .slice(-3)
    .flatMap((message) => (message.role === "assistant" ? (message.tools ?? []) : []))
    .slice(-limit)
}

export function toolRunKind(
  state: ThreadToolCall["state"]
): "running" | "ok" | "error" | "denied" {
  if (state === "output-available") return "ok"
  if (state === "output-error") return "error"
  if (state === "output-denied") return "denied"
  return "running"
}
