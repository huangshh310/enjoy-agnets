/**
 * 仅 ENJOY_E2E_STUB=1：不打真实 Provider，吐固定 fullStream，给窗口 E2E 用。
 */
import type { ModelMessage } from "ai"

export function isE2eStub(): boolean {
  return process.env.ENJOY_E2E_STUB === "1"
}

export function lastUserText(messages: ModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || message.role !== "user") continue
    if (typeof message.content === "string") return message.content
    if (!Array.isArray(message.content)) continue
    return message.content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part) return String(part.text ?? "")
        return ""
      })
      .join(" ")
  }
  return ""
}

export function stubApprovedWrite(messages: ModelMessage[]): boolean {
  return messages.some((message) => {
    if (message.role !== "tool" || !Array.isArray(message.content)) return false
    return message.content.some((part) => {
      if (!part || typeof part !== "object") return false
      const rec = part as { type?: string; approved?: boolean }
      return rec.type === "tool-approval-response" && rec.approved === true
    })
  })
}

export async function* createE2eStubStream(
  messages: ModelMessage[],
  signal: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const prompt = lastUserText(messages)
  if (stubApprovedWrite(messages)) {
    yield* emitText("stub-ok allowed write", signal)
    return
  }
  if (/\bwrite\b/i.test(prompt)) {
    yield {
      type: "tool-approval-request",
      toolCallId: "tool_stub",
      approvalId: "apr_stub",
      toolName: "write_file",
      input: { path: "e2e-stub.txt", content: "from stub" }
    }
    return
  }
  const attached = attachmentNames(messages)
  if (attached.length) {
    yield* emitText(`stub-ok attached:${attached.join(",")}`, signal)
    return
  }
  const body = `stub-ok ${prompt.slice(0, 48)}`.trim()
  const slow = /\bslow\b/i.test(prompt)
  yield* emitText(body, signal, slow ? 180 : 0)
}

async function* emitText(
  text: string,
  signal: AbortSignal,
  delayMs = 0
): AsyncGenerator<Record<string, unknown>> {
  yield { type: "text-start", id: "text" }
  for (const chunk of text.split(" ")) {
    if (signal.aborted) return
    if (delayMs) await wait(delayMs)
    yield { type: "text-delta", text: `${chunk} ` }
  }
  yield { type: "text-end", id: "text" }
  yield { type: "finish", usage: { inputTokens: 4, outputTokens: 8, totalTokens: 12 } }
}

function attachmentNames(messages: ModelMessage[]): string[] {
  const names: string[] = []
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (!part || typeof part !== "object" || !("type" in part) || part.type !== "file") continue
      if ("filename" in part && typeof part.filename === "string") names.push(part.filename)
    }
  }
  return names
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
