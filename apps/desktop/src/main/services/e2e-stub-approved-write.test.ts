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
  setE2eStubPackagedForTest,
  stubApprovedWriteResult,
  stubApprovedWriteToolCallId,
  STUB_WRITE_CONTENT,
  STUB_WRITE_PATH,
  writeStubApprovedFile
} from "./e2e-stub.ts"
import { resolveInsideWorkspace } from "./paths.ts"
import { hasUnsettled, rekill, resetRunSideEffectsForTest, summarize } from "./run-side-effects.ts"

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
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  try {
    const written = await writeStubApprovedFile()
    // macOS `/tmp` → `/private/tmp`；跟 jail 同一套 realpath，不要和 mkdtemp 字面路径比。
    assert.equal(written, resolveInsideWorkspace(root, STUB_WRITE_PATH))
    assert.ok(written)
    assert.equal(await readFile(written, "utf8"), STUB_WRITE_CONTENT)
  } finally {
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }
})

test("打包态不写 stub 盘", async () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(true)
  try {
    assert.equal(await writeStubApprovedFile("/tmp/not-used"), null)
  } finally {
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
  }
})


test("SLOW_TOOL 等待可中断：abort 后不写盘、不吐 tool-result，账本 blocked_before_start", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-abort-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousSlow = process.env.ENJOY_E2E_SLOW_TOOL
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_SLOW_TOOL = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  resetRunSideEffectsForTest()
  const ac = new AbortController()
  const parts: Record<string, unknown>[] = []
  const consume = (async () => {
    for await (const part of createE2eStubStream(approvedWriteMessages("apr_stub_1"), ac.signal, { runId: "run_slow" })) {
      parts.push(part)
    }
  })()
  await new Promise((resolve) => setTimeout(resolve, 80))
  ac.abort()
  await consume
  try {
    assert.equal(parts.some((part) => part.type === "tool-result"), false)
    const target = resolveInsideWorkspace(root, STUB_WRITE_PATH)
    await assert.rejects(() => readFile(target, "utf8"))
    const rows = summarize("run_slow")
    assert.equal(rows[0]?.phase, "blocked_before_start")
    assert.equal(rows[0]?.op, "stub_write")
  } finally {
    resetRunSideEffectsForTest()
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    process.env.ENJOY_E2E_SLOW_TOOL = previousSlow
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }
})

test("STUCK_TOOL：忽略 abort，rekill 立刻 settle 且不写盘", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-stuck-"))
  const previous = process.env.ENJOY_E2E_WORKSPACE
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousStuck = process.env.ENJOY_E2E_STUCK_TOOL
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_WORKSPACE = root
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_STUCK_TOOL = "1"
  process.env.ENJOY_E2E_USERDATA = previousUd || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  resetRunSideEffectsForTest()
  const ac = new AbortController()
  const consume = (async () => {
    for await (const _part of createE2eStubStream(approvedWriteMessages("apr_stub_2"), ac.signal, { runId: "run_stuck" })) {
      // fixture should not yield a write
    }
  })()
  await new Promise((resolve) => setTimeout(resolve, 80))
  ac.abort()
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(hasUnsettled("run_stuck"), true)
  const started = Date.now()
  await rekill("run_stuck")
  await consume
  try {
    assert.ok(Date.now() - started < 1_000, "rekill should settle immediately")
    assert.equal(hasUnsettled("run_stuck"), false)
    const rows = summarize("run_stuck")
    assert.equal(rows[0]?.op, "bash")
    assert.equal(rows[0]?.phase, "settled")
    assert.equal(rows[0]?.outcome, "killed")
    const target = resolveInsideWorkspace(root, STUB_WRITE_PATH)
    await assert.rejects(() => readFile(target, "utf8"))
  } finally {
    resetRunSideEffectsForTest()
    setE2eStubPackagedForTest(undefined)
    process.env.ENJOY_E2E_WORKSPACE = previous
    process.env.ENJOY_E2E_STUB = previousStub
    process.env.ENJOY_E2E_STUCK_TOOL = previousStuck
    if (previousUd == null) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
    await rm(root, { recursive: true, force: true })
  }
})
