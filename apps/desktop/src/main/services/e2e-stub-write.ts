/**
 * stub 写盘片段：审批卡，或会话已放行时直接 tool-call + 落盘。
 */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { isE2eStub } from "./e2e-stub-gate.ts"
import { resolveInsideWorkspace } from "./paths.ts"

export const STUB_WRITE_PATH = "e2e-stub.txt"
export const STUB_WRITE_CONTENT = "from stub"

export const STUB_WRITE_INPUT = { path: STUB_WRITE_PATH, content: STUB_WRITE_CONTENT }

export function stubWriteApprovalPart(seq: number): Record<string, unknown> {
  return {
    type: "tool-approval-request",
    toolCallId: `tool_stub_${seq}`,
    approvalId: `apr_stub_${seq}`,
    toolName: "write_file",
    input: STUB_WRITE_INPUT
  }
}

export function stubWriteToolCallPart(toolCallId: string): Record<string, unknown> {
  return {
    type: "tool-call",
    toolCallId,
    toolName: "write_file",
    input: STUB_WRITE_INPUT
  }
}

export function stubApprovedWriteResult(toolCallId: string): Record<string, unknown> {
  return {
    type: "tool-result",
    toolCallId,
    toolName: "write_file",
    input: STUB_WRITE_INPUT,
    output: { ok: true, path: STUB_WRITE_PATH }
  }
}

/** 活泵允许后补写盘；无工作区根则只吐 tool-result，不假装已经落盘。 */
export async function writeStubApprovedFile(
  root = process.env.ENJOY_E2E_WORKSPACE
): Promise<string | null> {
  if (!isE2eStub()) return null
  const workspace = root?.trim()
  if (!workspace) return null
  const abs = resolveInsideWorkspace(workspace, STUB_WRITE_PATH)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, STUB_WRITE_CONTENT, "utf8")
  return abs
}

/** 策略已放行：先落盘，再 tool-call + tool-result，调用方再发正文。 */
export async function stubPolicyAllowedWriteParts(
  toolCallId: string
): Promise<Record<string, unknown>[]> {
  await writeStubApprovedFile()
  return [stubWriteToolCallPart(toolCallId), stubApprovedWriteResult(toolCallId)]
}
