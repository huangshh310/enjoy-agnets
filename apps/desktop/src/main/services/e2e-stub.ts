/**
 * 仅 ENJOY_E2E_STUB=1：不打真实 Provider，吐固定 fullStream，给窗口 E2E 用。
 */
import type { ModelMessage } from "ai"
import { stubDesktopStreamParts } from "./e2e-stub-desktop.ts"

export function isE2eStub(): boolean {
  return process.env.ENJOY_E2E_STUB === "1"
}

export { isE2eCuReady } from "./e2e-stub-desktop.ts"

function userText(message: ModelMessage | undefined): string {
  if (!message) return ""
  if (typeof message.content === "string") return message.content
  if (!Array.isArray(message.content)) return ""
  return message.content
    .map((part) => {
      if (typeof part === "string") return part
      if (part && typeof part === "object" && "text" in part) return String(part.text ?? "")
      return ""
    })
    .join(" ")
}

function isCiteUser(message: ModelMessage): boolean {
  return userText(message).startsWith("Cite these workspace sources:")
}

/** Stop 会丢掉空助手气泡，下一句和未完成用户句连在一起；cite 又会再垫一条。取最后一条非 cite 用户句。 */
function lastRealUser(messages: ModelMessage[]): ModelMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== "user") continue
    if (isCiteUser(message)) continue
    return message
  }
  return undefined
}

export function lastUserText(messages: ModelMessage[]): string {
  return userText(lastRealUser(messages))
}

export function stubApprovedWrite(messages: ModelMessage[]): boolean {
  return hasApprovalResponse(messages, true)
}

/** 拒绝后不得再吐同一张审批卡，否则会撞 approvals.id。 */
export function stubDeniedApproval(messages: ModelMessage[]): boolean {
  return hasApprovalResponse(messages, false)
}

function hasApprovalResponse(messages: ModelMessage[], approved: boolean): boolean {
  return messages.some((message) => {
    if (message.role !== "tool" || !Array.isArray(message.content)) return false
    return message.content.some((part) => {
      if (!part || typeof part !== "object") return false
      const rec = part as { type?: string; approved?: boolean }
      return rec.type === "tool-approval-response" && rec.approved === approved
    })
  })
}

export async function* createE2eStubStream(
  messages: ModelMessage[],
  signal: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const real = lastRealUser(messages)
  const prompt = userText(real)
  if (stubDeniedApproval(messages)) {
    yield { type: "finish", usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 } }
    return
  }
  const desktop = stubDesktopStreamParts(prompt)
  if (desktop) {
    for (const part of desktop) yield part
    return
  }
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
  const attached = attachmentNames(real ? [real] : [])
  if (attached.length) {
    yield* emitText(`stub-ok attached:${attached.join(",")}`, signal)
    return
  }
  const body = `stub-ok ${prompt.slice(0, 48)}`.trim()
  const slow = /\bslow\b/i.test(prompt)
  yield* emitText(body, signal, slow ? 400 : 0)
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
  for (const message of messages) collectAttachmentNames(message, names)
  return names
}

function collectAttachmentNames(message: ModelMessage, names: string[]) {
  const blobs: string[] = []
  if (typeof message.content === "string") blobs.push(message.content)
  else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (!part || typeof part !== "object") continue
      if ("text" in part && typeof part.text === "string") blobs.push(part.text)
      if ("type" in part && part.type === "file" && "filename" in part && typeof part.filename === "string") {
        names.push(part.filename)
      }
    }
  }
  pushAttachedNames(blobs.join("\n"), names)
}

function pushAttachedNames(text: string, names: string[]) {
  for (const match of text.matchAll(/Attached file:\s*(\S+)/g)) {
    if (match[1]) names.push(match[1])
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
