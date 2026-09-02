/**
 * 泵时记下本轮发给模型的指令与消息。进程内按 sessionId 覆盖，重启即丢。
 */
import type { InspectPromptMessage, InspectPromptResult } from "@enjoy-agents/ipc-contract"

const lastBySession = new Map<string, InspectPromptResult>()

export function rememberInspectPrompt(snapshot: InspectPromptResult) {
  lastBySession.set(snapshot.sessionId, snapshot)
}

export function getInspectPromptSnapshot(sessionId: string): InspectPromptResult | undefined {
  return lastBySession.get(sessionId)
}

export function clearInspectPromptSnapshots() {
  lastBySession.clear()
}

/** 去掉 file data / Uint8Array，避免把附件字节打进 IPC。 */
export function sanitizeModelMessages(messages: unknown[]): InspectPromptMessage[] {
  return messages.map((message) => sanitizeOne(message))
}

function sanitizeOne(message: unknown): InspectPromptMessage {
  if (!message || typeof message !== "object") {
    return { role: "user", content: "" }
  }
  const row = message as { role?: unknown; content?: unknown }
  return {
    role: typeof row.role === "string" ? row.role : "user",
    content: stripBytes(row.content)
  }
}

function stripBytes(value: unknown): unknown {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return `[bytes ${value.length}]`
  }
  if (value instanceof Uint8Array) {
    return `[bytes ${value.byteLength}]`
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripBytes(item))
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(record)) {
      next[key] = key === "data" ? "[omitted]" : stripBytes(item)
    }
    return next
  }
  return value
}
