import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createE2eStubStream,
  isE2eStub,
  lastUserText,
  shouldEmitHugeMcpApp,
  shouldFailStubStore,
  stubApprovedWrite,
  stubDeniedApproval,
  STUB_HUGE_MCP_APP_PROMPT,
  STUB_HUGE_MCP_APP_PROMPT_ZH,
  STUB_STORE_ERROR_PROMPT,
  STUB_STORE_ERROR_PROMPT_ZH,
  STUB_TERMINAL_LINK_ECHO,
  STUB_TERMINAL_LINK_URL
} from "./e2e-stub.ts"
import {
  isVerySlowPrompt,
  isWriteSlowNotePrompt,
  STUB_VERY_SLOW_MS,
  verySlowDelayMs,
  verySlowHead
} from "./e2e-stub-slow.ts"
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

test("very slow 只在 stub 开发态认，打包态当普通句", async () => {
  const previous = process.env.ENJOY_E2E_STUB
  const previousSlow = process.env.ENJOY_E2E_STUB_SLOW_MS
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_STUB_SLOW_MS = "0"
  try {
    assert.equal(isVerySlowPrompt("please go very slow now", false), true)
    assert.equal(isVerySlowPrompt("please go very slow now", true), false)
    assert.ok(STUB_VERY_SLOW_MS >= 1500)
    assert.equal(verySlowDelayMs(), 0)
    assert.ok(verySlowHead().startsWith("one"))
    const packed: string[] = []
    for await (const part of createE2eStubStream(
      [{ role: "user", content: "please go very slow now" }],
      new AbortController().signal,
      { packaged: true }
    )) {
      packed.push(String(part.type))
    }
    assert.equal(packed.includes("tool-approval-request"), false)
    assert.ok(packed.includes("text-delta"))

    const types: string[] = []
    let text = ""
    for await (const part of createE2eStubStream(
      [{ role: "user", content: "please go very slow now" }],
      new AbortController().signal
    )) {
      types.push(String(part.type))
      if (part.type === "text-delta") text += String(part.text ?? "")
    }
    assert.match(text, /one two three four five/)
    assert.equal(types.includes("tool-approval-request"), true)
    assert.equal(types.at(-1), "tool-approval-request")
  } finally {
    process.env.ENJOY_E2E_STUB = previous
    if (previousSlow == null) delete process.env.ENJOY_E2E_STUB_SLOW_MS
    else process.env.ENJOY_E2E_STUB_SLOW_MS = previousSlow
  }
})

test("please write slow note：先审批，允许后写盘再慢流", async () => {
  const previous = process.env.ENJOY_E2E_STUB
  const previousSlow = process.env.ENJOY_E2E_STUB_SLOW_MS
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_STUB_SLOW_MS = "0"
  try {
    assert.equal(isWriteSlowNotePrompt("please write slow note", false), true)
    assert.equal(isWriteSlowNotePrompt("please write slow note", true), false)
    const first: string[] = []
    for await (const part of createE2eStubStream(
      [{ role: "user", content: "please write slow note" }],
      new AbortController().signal
    )) {
      first.push(String(part.type))
    }
    assert.deepEqual(first, ["tool-approval-request"])

    let text = ""
    const after: string[] = []
    for await (const part of createE2eStubStream(
      [
        { role: "user", content: "please write slow note" },
        {
          role: "tool",
          content: [{ type: "tool-approval-response", approved: true }]
        } as never
      ],
      new AbortController().signal
    )) {
      after.push(String(part.type))
      if (part.type === "text-delta") text += String(part.text ?? "")
    }
    assert.equal(after.includes("tool-result"), true)
    assert.match(text, /one two three/)
    assert.doesNotMatch(text, /stub-ok allowed write/)
  } finally {
    process.env.ENJOY_E2E_STUB = previous
    if (previousSlow == null) delete process.env.ENJOY_E2E_STUB_SLOW_MS
    else process.env.ENJOY_E2E_STUB_SLOW_MS = previousSlow
  }
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

test("上一轮允许写盘后，下一句不得复读 allowed write", async () => {
  assert.equal(
    stubApprovedWrite([
      { role: "user", content: "write a note" },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: true }]
      } as never,
      { role: "assistant", content: "stub-ok allowed write" },
      { role: "user", content: "hello again" }
    ]),
    false
  )
  let text = ""
  for await (const part of createE2eStubStream(
    [
      { role: "user", content: "write a note" },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: true }]
      } as never,
      { role: "assistant", content: "stub-ok allowed write" },
      { role: "user", content: "hello again" }
    ],
    new AbortController().signal
  )) {
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.match(text, /stub-ok hello again/)
  assert.doesNotMatch(text, /allowed write/)
})

test("上一轮拒绝写盘后，下一句仍要回复，不能空 finish", async () => {
  assert.equal(
    stubDeniedApproval([
      { role: "user", content: "write a note" },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: false }]
      } as never,
      { role: "user", content: "hello after deny" }
    ]),
    false
  )
  const parts: string[] = []
  let text = ""
  for await (const part of createE2eStubStream(
    [
      { role: "user", content: "write a note" },
      {
        role: "tool",
        content: [{ type: "tool-approval-response", approved: false }]
      } as never,
      { role: "user", content: "hello after deny" }
    ],
    new AbortController().signal
  )) {
    parts.push(String(part.type))
    if (part.type === "text-delta") text += String(part.text ?? "")
  }
  assert.equal(parts.includes("tool-approval-request"), false)
  assert.match(text, /stub-ok hello after deny/)
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

test("开发态 stub 超大 MCP App：打包态不吐警告", async () => {
  const previous = process.env.ENJOY_E2E_STUB
  process.env.ENJOY_E2E_STUB = "1"
  try {
    assert.equal(shouldEmitHugeMcpApp(STUB_HUGE_MCP_APP_PROMPT, false), true)
    assert.equal(shouldEmitHugeMcpApp(STUB_HUGE_MCP_APP_PROMPT_ZH, false), true)
    assert.equal(shouldEmitHugeMcpApp(STUB_HUGE_MCP_APP_PROMPT, true), false)
    const types: string[] = []
    const codes: string[] = []
    for await (const part of createE2eStubStream(
      [{ role: "user", content: STUB_HUGE_MCP_APP_PROMPT }],
      new AbortController().signal
    )) {
      types.push(String(part.type))
      if (part.type === "generation.warning") codes.push(String(part.code ?? ""))
      if (part.type === "mcp.app") {
        assert.equal(part.phase, "error")
        assert.equal(part.srcDoc, undefined)
      }
    }
    assert.ok(types.includes("mcp.app"))
    assert.ok(types.includes("generation.warning"))
    assert.deepEqual(codes, ["mcp_app_srcdoc_too_large"])
    const packaged: string[] = []
    for await (const part of createE2eStubStream(
      [{ role: "user", content: STUB_HUGE_MCP_APP_PROMPT }],
      new AbortController().signal,
      { packaged: true }
    )) {
      packaged.push(String(part.type))
    }
    assert.equal(packaged.includes("generation.warning"), false)
    assert.ok(packaged.includes("text-delta"))
  } finally {
    process.env.ENJOY_E2E_STUB = previous
  }
})

test("开发态 stub 存储失败夹具：打包态不扔", async () => {
  const previous = process.env.ENJOY_E2E_STUB
  process.env.ENJOY_E2E_STUB = "1"
  try {
    assert.equal(isE2eStub(false), true)
    assert.equal(isE2eStub(true), false)
    assert.equal(shouldFailStubStore(STUB_STORE_ERROR_PROMPT, false), true)
    assert.equal(shouldFailStubStore(STUB_STORE_ERROR_PROMPT_ZH, false), true)
    assert.equal(shouldFailStubStore(STUB_STORE_ERROR_PROMPT, true), false)
    assert.equal(shouldFailStubStore("hello", false), false)
    await assert.rejects(
      (async () => {
        for await (const _part of createE2eStubStream(
          [{ role: "user", content: STUB_STORE_ERROR_PROMPT }],
          new AbortController().signal
        )) {
          void _part
        }
      })(),
      /INTERNAL_STORE_ERROR/
    )
    const safe: string[] = []
    for await (const part of createE2eStubStream(
      [{ role: "user", content: STUB_STORE_ERROR_PROMPT }],
      new AbortController().signal,
      { packaged: true }
    )) {
      safe.push(String(part.type))
    }
    assert.ok(safe.includes("finish"))
  } finally {
    process.env.ENJOY_E2E_STUB = previous
  }
})
