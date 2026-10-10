/**
 * 允许写盘后 stub 必须先吐匹配 toolCallId 的 tool-result，并写入 e2e-stub.txt。
 */
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { ModelMessage } from "ai"
import {
  createE2eStubStream,
  stubApprovedWriteResult,
  stubApprovedWriteToolCallId,
  STUB_WRITE_CONTENT,
  STUB_WRITE_PATH,
  writeStubApprovedFile
} from "./e2e-stub.ts"
import { resolveInsideWorkspace } from "./paths.ts"

function approvedWriteMessages(approvalId?: string): ModelMessage[] {
  return [
    { role: "user", content: "please write a note" },
    {
      role: "tool",
      content: [
        approvalId
          ? { type: "tool-approval-response", approvalId, approved: true }
          : { type: "tool-approval-response", approved: true }
      ]
    } as never
  ]
}

test("apr_stub_N 回写成同一序号的 tool_stub_N", () => {
  assert.equal(stubApprovedWriteToolCallId(approvedWriteMessages("apr_stub_7")), "tool_stub_7")
})

test("允许后先 tool-result 再正文，toolCallId 对上审批卡", async () => {
  let approvalId = ""
  let toolCallId = ""
  for await (const part of createE2eStubStream(
    [{ role: "user", content: "please write a note" }],
    new AbortController().signal
  )) {
    if (part.type !== "tool-approval-request") continue
    approvalId = String(part.approvalId ?? "")
    toolCallId = String(part.toolCallId ?? "")
  }
  assert.match(approvalId, /^apr_stub_\d+$/)
  assert.equal(toolCallId, approvalId.replace("apr_stub_", "tool_stub_"))

  const parts: Record<string, unknown>[] = []
  for await (const part of createE2eStubStream(
    approvedWriteMessages(approvalId),
    new AbortController().signal
  )) {
    parts.push(part)
  }
  assert.deepEqual(parts[0], stubApprovedWriteResult(toolCallId))
  const resultIndex = parts.findIndex((part) => part.type === "tool-result")
  const textIndex = parts.findIndex((part) => part.type === "text-start")
  assert.ok(resultIndex >= 0 && textIndex > resultIndex)
})

test("允许后写入 ENJOY_E2E_WORKSPACE/e2e-stub.txt", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-write-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  try {
    const written = await writeStubApprovedFile()
    // macOS `/tmp` → `/private/tmp`；跟 jail 同一套 realpath，不要和 mkdtemp 字面路径比。
    assert.equal(written, resolveInsideWorkspace(root, STUB_WRITE_PATH))
    assert.ok(written)
    assert.equal(await readFile(written, "utf8"), STUB_WRITE_CONTENT)
  } finally {
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    await rm(root, { recursive: true, force: true })
  }
})

test("打包态不写 stub 盘", async () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  process.env.ENJOY_E2E_STUB = "1"
  try {
    assert.equal(await writeStubApprovedFile("/tmp/not-used", true), null)
  } finally {
    process.env.ENJOY_E2E_STUB = previousStub
  }
})
