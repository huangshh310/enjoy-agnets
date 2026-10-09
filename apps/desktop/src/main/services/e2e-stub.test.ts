import assert from "node:assert/strict"
import { test } from "node:test"
import { createE2eStubStream, lastUserText, stubApprovedWrite } from "./e2e-stub.ts"
import { stubDesktopStreamParts } from "./e2e-stub-desktop.ts"

test("lastUserText 取最后一条用户字", () => {
  assert.equal(
    lastUserText([
      { role: "user", content: "one" },
      { role: "assistant", content: "nope" },
      { role: "user", content: "two" }
    ]),
    "two"
  )
})

test("write 提示发出审批 part", async () => {
  const parts: string[] = []
  for await (const part of createE2eStubStream(
    [{ role: "user", content: "please write a note" }],
    new AbortController().signal
  )) {
    parts.push(String(part.type))
  }
  assert.deepEqual(parts, ["tool-approval-request"])
})

test("已批准写盘后回 stub-ok allowed write", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [
      { role: "user", content: "write" },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: true }]
      } as never
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /stub-ok allowed write/)
})

test("Stop 后未完成的上一句不抢本轮 write", async () => {
  const parts: string[] = []
  for await (const part of createE2eStubStream(
    [
      { role: "assistant", content: "stub-ok hello" },
      { role: "user", content: "please go slow now" },
      { role: "user", content: "please write a note" }
    ],
    new AbortController().signal
  )) {
    parts.push(String(part.type))
  }
  assert.deepEqual(parts, ["tool-approval-request"])
})

test("cite 垫句不吞本轮附件", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [
      {
        role: "user",
        content: [
          { type: "text", text: "read this" },
          { type: "text", text: "Attached file: note.txt\n\nbody" }
        ]
      } as never,
      { role: "user", content: "Cite these workspace sources:\n- readme.md:0 hello" }
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /attached:note.txt/)
})

test("上一轮附件不抢本轮普通回复", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [
      { role: "user", content: "Attached file: note.txt\n\nbody\n\nread this" },
      { role: "assistant", content: "stub-ok attached:note.txt" },
      { role: "user", content: "hello again" }
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /stub-ok hello again/)
  assert.doesNotMatch(text, /attached/)
})

test("内联文本附件也会出现在 stub 回复里", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [{ role: "user", content: "Attached file: note.txt\n\nbody\n\nread this" }],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /attached:note.txt/)
})

test("附件文件名会出现在 stub 回复里", async () => {
  let text = ""
  for await (const part of createE2eStubStream(
    [
      {
        role: "user",
        content: [
          { type: "text", text: "read this" },
          { type: "file", filename: "note.txt", mediaType: "text/plain", data: new Uint8Array() }
        ]
      } as never
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /attached:note.txt/)
})

test("桌面 stub 吐日历审批、终端审批、坐标硬拒", async () => {
  const calendar = stubDesktopStreamParts("desktop calendar click") ?? []
  assert.equal(calendar[0]?.toolName, "desktop_act")
  assert.equal((calendar[0]?.input as { sensitive?: boolean } | undefined)?.sensitive, false)
  const term = stubDesktopStreamParts("desktop terminal click") ?? []
  assert.equal((term[0]?.input as { sensitive?: boolean } | undefined)?.sensitive, true)
  const coords = stubDesktopStreamParts("desktop coords deny") ?? []
  assert.equal(coords[1]?.type, "tool-output-denied")
  assert.equal((coords[1]?.output as { code?: string } | undefined)?.code, "bare_coords_disabled")
  const parts: string[] = []
  for await (const part of createE2eStubStream(
    [{ role: "user", content: "desktop calendar click" }],
    new AbortController().signal
  )) {
    parts.push(String(part.type))
  }
  assert.deepEqual(parts, ["tool-approval-request"])
})

test("成本夹具 stub finish 带 SDK v7 totalUsage", async () => {
  process.env.ENJOY_DEV_SEED_COST = "1"
  process.env.ENJOY_E2E_STUB = "1"
  try {
    const parts: Record<string, unknown>[] = []
    for await (const part of createE2eStubStream(
      [{ role: "user", content: "hello cost" }],
      new AbortController().signal
    )) {
      parts.push(part)
    }
    const finish = parts.find((part) => part.type === "finish")
    const step = parts.find((part) => part.type === "finish-step")
    assert.ok(finish)
    assert.ok(step)
    const total = finish.totalUsage as { inputTokens?: number; outputTokens?: number }
    assert.equal(total.inputTokens, 1_000_000)
    assert.equal(total.outputTokens, 20_000)
  } finally {
    delete process.env.ENJOY_DEV_SEED_COST
    delete process.env.ENJOY_E2E_STUB
  }
})

test("stubApprovedWrite 识别 tool-approval-response", () => {
  assert.equal(
    stubApprovedWrite([
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: true }]
      } as never
    ]),
    true
  )
})
