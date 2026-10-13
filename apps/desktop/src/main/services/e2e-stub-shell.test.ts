/**
 * 命令夹具：触发词映射、真审批卡、允许后假输出、会话允许走真实 resolveToolApproval。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type { ModelMessage } from "ai"
import { resolveToolApproval } from "@enjoy-agents/agent-core"
import { createE2eStubStream } from "./e2e-stub.ts"
import {
  isStubShellFixtureInput,
  STUB_LONG_COMMAND,
  STUB_SHELL_FIXTURES,
  stubShellFixtureFor,
  stubShellToolCallIdFor
} from "./e2e-stub-shell.ts"
import { sessionAllowCardState } from "../../renderer/src/components/ai-chat/thread/approval/session-allow-hint.ts"

const REQUIRE_ALL = { requireWriteApproval: true, requireBashApproval: true, requireCommitApproval: true }

async function collect(messages: ModelMessage[], approved?: (name: string, input: unknown) => boolean) {
  const parts: Array<Record<string, unknown>> = []
  for await (const part of createE2eStubStream(messages, new AbortController().signal, {
    isToolApproved: approved
  })) {
    parts.push(part)
  }
  return parts
}

test("触发词完全相等才认，run bash ls -la 不被 run bash ls 吞掉", () => {
  assert.deepEqual(stubShellFixtureFor("run bash ls")?.input, { command: "ls" })
  assert.deepEqual(stubShellFixtureFor("run bash ls -la")?.input, { command: "ls -la" })
  assert.deepEqual(stubShellFixtureFor("  Run   Bash  LS  -LA ")?.input, { command: "ls -la" })
  assert.equal(stubShellFixtureFor("run code")?.toolName, "code_mode")
  assert.deepEqual(Object.keys(stubShellFixtureFor("run code")?.input ?? {}).sort(), ["command", "path", "source"])
  assert.equal(stubShellFixtureFor("run long")?.input.command, STUB_LONG_COMMAND)
  assert.ok(STUB_LONG_COMMAND.length > 4096)
  assert.equal(stubShellFixtureFor("run pipe")?.input.command, "ls | head")
  for (const miss of ["run bash", "run bash ls -l", "please run bash ls", "run bash ls now", "run codes", "write"]) {
    assert.equal(stubShellFixtureFor(miss), undefined, miss)
  }
  assert.equal(new Set(STUB_SHELL_FIXTURES.map((f) => f.key)).size, STUB_SHELL_FIXTURES.length)
})

test("未放行：每个触发词吐一张真审批卡，不吐 tool-result、不吐正文", async () => {
  for (const fixture of STUB_SHELL_FIXTURES) {
    const parts = await collect([{ role: "user", content: fixture.trigger }], () => false)
    assert.equal(parts.length, 1, fixture.trigger)
    const card = parts[0]!
    assert.equal(card.type, "tool-approval-request")
    assert.equal(card.toolName, fixture.toolName)
    assert.deepEqual(card.input, fixture.input)
    assert.equal(stubShellToolCallIdFor(String(card.approvalId)), card.toolCallId)
  }
})

test("允许后吐同 toolCallId 的假 tool-result 与 stub-ok ran 正文，不吐第二张卡", async () => {
  const first = await collect([{ role: "user", content: "run bash ls" }], () => false)
  const card = first[0]!
  const parts = await collect([
    { role: "user", content: "run bash ls" },
    {
      role: "tool",
      content: [{ type: "tool-approval-response", approvalId: String(card.approvalId), approved: true }]
    } as unknown as ModelMessage
  ])
  assert.equal(parts[0]?.type, "tool-result")
  assert.equal(parts[0]?.toolCallId, card.toolCallId)
  assert.equal(parts[0]?.toolName, "bash")
  const output = parts[0]?.output as { stdout?: string } | undefined
  assert.match(String(output?.stdout), /nothing was executed/)
  assert.equal(parts.some((part) => part.type === "tool-approval-request"), false)
  const text = parts.filter((part) => part.type === "text-delta").map((part) => part.text).join("")
  assert.match(text, /stub-ok ran ls/)
})

test("会话已记 ls：真实 resolveToolApproval 放行 run bash ls，run bash ls -la 仍弹卡", async () => {
  const policy = { ...REQUIRE_ALL, sessionApprovedBashCommands: ["ls"] }
  const approved = (name: string, input: unknown) => resolveToolApproval(name, "agent", policy, input) === "approved"
  const ls = await collect([{ role: "user", content: "run bash ls" }], approved)
  assert.deepEqual(
    ls.slice(0, 2).map((part) => part.type),
    ["tool-call", "tool-result"]
  )
  assert.equal(ls.some((part) => part.type === "tool-approval-request"), false)
  const lsla = await collect([{ role: "user", content: "run bash ls -la" }], approved)
  assert.equal(lsla[0]?.type, "tool-approval-request")
})

test("run code / run long / run pipe：即使表里已有同名命令也弹卡，卡片只允许一次", async () => {
  for (const trigger of ["run code", "run long", "run pipe"]) {
    const fixture = stubShellFixtureFor(trigger)!
    const command = fixture.input.command!
    const policy = { ...REQUIRE_ALL, sessionApprovedBashCommands: [command, "ls", "sh stub-script.sh"] }
    const approved = (name: string, input: unknown) =>
      resolveToolApproval(name, "agent", policy, input) === "approved"
    const parts = await collect([{ role: "user", content: trigger }], approved)
    assert.equal(parts[0]?.type, "tool-approval-request", trigger)
    const state = sessionAllowCardState(fixture.toolName, command)
    assert.equal(state.showSession, false, trigger)
    assert.equal(state.onceOnly, true, trigger)
  }
  assert.equal(sessionAllowCardState("bash", "ls").showSession, true)
})

test("重启无 waiter：executeStoredTool 对夹具入参只回 ok，不真跑", () => {
  for (const fixture of STUB_SHELL_FIXTURES) {
    assert.equal(isStubShellFixtureInput(fixture.toolName, { ...fixture.input }), true)
  }
  assert.equal(isStubShellFixtureInput("bash", { command: "ls -l" }), false)
  assert.equal(isStubShellFixtureInput("code_mode", { command: "ls" }), false)
  const src = readFileSync(new URL("./execute-stored-tool.ts", import.meta.url), "utf8")
  const guard = src.indexOf("if (isE2eStub() && isStubShellFixtureInput(pending.name, args)) return { kind: \"ok\" }")
  assert.ok(guard > 0 && guard < src.indexOf("await host.bash("))
  assert.ok(guard < src.indexOf("await resumeCodeMode("))
})

test("leo soft 3：多带一个键（cwd / env）就不算夹具，不会被短路成假成功", () => {
  for (const fixture of STUB_SHELL_FIXTURES) {
    assert.equal(isStubShellFixtureInput(fixture.toolName, { ...fixture.input, cwd: "/" }), false)
    assert.equal(isStubShellFixtureInput(fixture.toolName, { ...fixture.input, env: { A: "1" } }), false)
  }
  assert.equal(isStubShellFixtureInput("bash", {}), false)
})
