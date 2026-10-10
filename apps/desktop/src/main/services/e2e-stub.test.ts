import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createE2eStubStream,
  lastUserText,
  stubApprovedWrite,
  stubDeniedApproval,
  STUB_TERMINAL_LINK_ECHO,
  STUB_TERMINAL_LINK_URL
} from "./e2e-stub.ts"
import {
  applyStubDesktopObservation,
  stubDesktopStreamParts,
  stubFreshDesktopActResult
} from "./e2e-stub-desktop.ts"
import { createObservationLedger } from "@enjoy-agents/agent-core/computer-use"

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

test("stub 终端链接夹具是可点 https URL", async () => {
  assert.equal(STUB_TERMINAL_LINK_URL, "https://example.com/docs")
  assert.equal(STUB_TERMINAL_LINK_ECHO, "echo https://example.com/docs")
  const { readFileSync } = await import("node:fs")
  const { dirname, join } = await import("node:path")
  const { fileURLToPath } = await import("node:url")
  const terminal = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "terminal.ts"), "utf8")
  assert.match(terminal, /seedStubTerminalLink/)
  assert.match(terminal, /STUB_TERMINAL_LINK_ECHO/)
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

test("允许一次后桌面 stub 不再重放审批，收工", async () => {
  const allowed = [
    { role: "user" as const, content: "desktop catchup notes" },
    {
      role: "tool" as const,
      content: [{ type: "tool-approval-response", approvalId: "apr_catchup", approved: true }]
    } as never
  ]
  const parts: string[] = []
  for await (const part of createE2eStubStream(allowed, new AbortController().signal)) {
    parts.push(String(part.type))
  }
  assert.equal(parts.includes("tool-approval-request"), false)
  assert.deepEqual(parts, ["finish"])
})

test("stub 新鲜观察可 take，允许一次返回 completed", () => {
  const ledger = createObservationLedger()
  const input = { observationId: "obs_notes", appName: "备忘录", appKey: "com.apple.notes", elementName: "今日" }
  const seeded = applyStubDesktopObservation((observation) => ledger.put(observation), input)
  assert.equal(seeded.id, "obs_notes")
  assert.equal(ledger.freeze("obs_notes"), true)
  const taken = ledger.take("obs_notes")
  assert.equal(taken.ok, true)
  if (taken.ok) assert.equal(taken.observation.appName, "备忘录")

  const previous = process.env.ENJOY_E2E_STUB
  process.env.ENJOY_E2E_STUB = "1"
  const fresh = new Map<string, { id: string }>([["obs_notes", { id: "obs_notes" }]])
  const result = stubFreshDesktopActResult(input, (id) => fresh.get(id) ?? null)
  process.env.ENJOY_E2E_STUB = previous
  assert.deepEqual(result, { success: true, observationId: "obs_notes" })
})

test("拒绝后继续不再重放同一张审批", async () => {
  const denied = [
    { role: "user" as const, content: "desktop catchup notes" },
    {
      role: "tool" as const,
      content: [{ type: "tool-approval-response", approvalId: "apr_catchup", approved: false }]
    } as never
  ]
  assert.equal(stubDeniedApproval(denied), true)
  const parts: string[] = []
  for await (const part of createE2eStubStream(denied, new AbortController().signal)) {
    parts.push(String(part.type))
  }
  assert.equal(parts.includes("tool-approval-request"), false)
  assert.deepEqual(parts, ["finish"])
})
