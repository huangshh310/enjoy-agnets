/**
 * 仅 ENJOY_E2E_STUB=1 且未打包（读不到 app 当打包）、且有隔离 userData：
 * 不打真实 Provider，吐固定 fullStream，给窗口 E2E 用。
 *
 * 写盘：未放行时只吐 `write_file` 审批卡，**绝不**在允许前写 e2e-stub.txt。
 * 会话策略已放行（`isToolApproved`）时直接 tool-call + 落盘 +「stub-ok allowed write」，不弹卡。
 * 活泵允许后有 waiter，`executeStoredTool` 不会跑（那条路只给重启无 wait）。
 * 允许后必须先吐匹配 `toolCallId` 的 `tool-result`，再写 `ENJOY_E2E_WORKSPACE/e2e-stub.txt`，
 * 最后才发正文；否则工具停在 input-available，`finalizeRun` 会封成
 * output-error「No result received.」，账本显示「1 个失败」。
 * 上一轮的审批响应不得让下一句复读结果。
 *
 * 终端可点链接夹具（给 luna 验悬停）：
 * - stub 打开审查栏 Terminal 后会自动 echo `STUB_TERMINAL_LINK_URL`
 * - 非 stub 开发也可在终端输入 `echo https://example.com/docs`
 */
import type { ModelMessage } from "ai"
import { isE2eStub } from "./e2e-stub-gate.ts"
import { stubDesktopStreamParts } from "./e2e-stub-desktop.ts"
import {
  isVerySlowPrompt,
  isWriteSlowNotePrompt,
  STUB_VERY_SLOW_WORDS,
  verySlowDelayMs,
  verySlowHead,
  verySlowTail
} from "./e2e-stub-slow.ts"
import {
  stubApprovedWriteResult,
  stubPolicyAllowedWriteParts,
  stubWriteApprovalPart,
  STUB_WRITE_INPUT,
  writeStubApprovedFile
} from "./e2e-stub-write.ts"

export {
  stubApprovedWriteResult,
  STUB_WRITE_CONTENT,
  STUB_WRITE_PATH,
  writeStubApprovedFile
} from "./e2e-stub-write.ts"

export const STUB_TERMINAL_LINK_URL = "https://example.com/docs"
export const STUB_TERMINAL_LINK_ECHO = `echo ${STUB_TERMINAL_LINK_URL}`
/** 开发 / e2e 夹具：发送这句让本轮以存储失败收口，验红条。打包态不生效。 */
export const STUB_STORE_ERROR_PROMPT = "stub store error"
export const STUB_STORE_ERROR_PROMPT_ZH = "夹具：存储失败"

export type E2eStubStreamOpts = {
  /** 会话策略已放行写盘时为真，stub 直接执行、不弹卡。 */
  isToolApproved?: (toolName: string, input: unknown) => boolean
}

export { isE2eStub, setE2eStubPackagedForTest } from "./e2e-stub-gate.ts"

/** COST-P3 复检夹具：开发态 stub 才吐带单价的 totalUsage。 */
export function isE2eCostSeed(): boolean {
  return isE2eStub() && process.env.ENJOY_DEV_SEED_COST === "1"
}

export function isStubStoreErrorPrompt(text: string): boolean {
  const trimmed = text.trim()
  return trimmed === STUB_STORE_ERROR_PROMPT || trimmed === STUB_STORE_ERROR_PROMPT_ZH
}

export function shouldFailStubStore(prompt: string): boolean {
  return isE2eStub() && isStubStoreErrorPrompt(prompt)
}

let stubWriteSeq = 0

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
  return hasApprovalResponse(currentTurnMessages(messages), true)
}

/** 拒绝后不得再吐同一张审批卡，否则会撞 approvals.id。 */
export function stubDeniedApproval(messages: ModelMessage[]): boolean {
  return hasApprovalResponse(currentTurnMessages(messages), false)
}

/** 只看本轮：上一轮允许写盘后，下一句 hello 不得再复读 stub-ok allowed write。 */
function currentTurnMessages(messages: ModelMessage[]): ModelMessage[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.role !== "user") continue
    if (isCiteUser(message)) continue
    return messages.slice(i)
  }
  return messages
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

/** `apr_stub_N` → `tool_stub_N`，与审批卡同一 id，否则 fold 对不上、finalize 会封成失败。 */
export function stubApprovedWriteToolCallId(messages: ModelMessage[]): string {
  const approvalId = currentTurnApprovedId(messages)
  const match = /^apr_stub_(\d+)$/.exec(approvalId)
  if (match?.[1]) return `tool_stub_${match[1]}`
  if (stubWriteSeq > 0) return `tool_stub_${stubWriteSeq}`
  return "tool_stub_1"
}

function currentTurnApprovedId(messages: ModelMessage[]): string {
  for (const message of currentTurnMessages(messages)) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (!part || typeof part !== "object") continue
      const rec = part as { type?: string; approvalId?: string; approved?: boolean }
      if (rec.type === "tool-approval-response" && rec.approved === true) {
        return String(rec.approvalId ?? "")
      }
    }
  }
  return ""
}

export async function* createE2eStubStream(
  messages: ModelMessage[],
  signal: AbortSignal,
  opts?: E2eStubStreamOpts
): AsyncGenerator<Record<string, unknown>> {
  const real = lastRealUser(messages)
  const prompt = userText(real)
  if (shouldFailStubStore(prompt)) {
    throw new Error("INTERNAL_STORE_ERROR")
  }
  if (stubDeniedApproval(messages)) {
    yield { type: "finish", usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 } }
    return
  }
  if (hasApprovalResponse(messages, true) && stubDesktopStreamParts(prompt)) {
    yield { type: "finish", usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 } }
    return
  }
  const desktop = stubDesktopStreamParts(prompt)
  if (desktop) {
    for (const part of desktop) yield part
    return
  }
  if (stubApprovedWrite(messages)) {
    const toolCallId = stubApprovedWriteToolCallId(messages)
    await writeStubApprovedFile()
    yield stubApprovedWriteResult(toolCallId)
    if (isWriteSlowNotePrompt(prompt)) {
      yield* emitText(STUB_VERY_SLOW_WORDS.join(" "), signal, verySlowDelayMs())
      return
    }
    if (isVerySlowPrompt(prompt)) {
      yield* emitText(verySlowTail(), signal, verySlowDelayMs())
      return
    }
    yield* emitText("stub-ok allowed write", signal)
    return
  }
  if (isVerySlowPrompt(prompt)) {
    yield* emitText(verySlowHead(), signal, verySlowDelayMs())
    yield* emitStubWriteTurn(signal, opts)
    return
  }
  if (/\bwrite\b/i.test(prompt)) {
    yield* emitStubWriteTurn(signal, opts)
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

async function* emitStubWriteTurn(
  signal: AbortSignal,
  opts?: E2eStubStreamOpts
): AsyncGenerator<Record<string, unknown>> {
  stubWriteSeq += 1
  if (opts?.isToolApproved?.("write_file", STUB_WRITE_INPUT)) {
    for (const part of await stubPolicyAllowedWriteParts(`tool_stub_${stubWriteSeq}`)) {
      yield part
    }
    yield* emitText("stub-ok allowed write", signal)
    return
  }
  yield stubWriteApprovalPart(stubWriteSeq)
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
  if (isE2eCostSeed()) {
    yield {
      type: "finish-step",
      id: "s1",
      usage: { inputTokens: 800_000, outputTokens: 20_000 }
    }
    yield {
      type: "finish",
      usage: { inputTokens: 1, outputTokens: 1 },
      totalUsage: {
        inputTokens: 1_000_000,
        outputTokens: 20_000,
        totalTokens: 1_020_000,
        cachedInputTokens: 200_000,
        reasoningTokens: 8_000
      }
    }
    return
  }
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
