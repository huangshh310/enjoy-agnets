import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAcpUpdate } from "./map-events.ts"
import { pickAcpPermissionOption } from "./permissions.ts"

test("maps thought and message chunks", () => {
  assert.deepEqual(
    mapAcpUpdate({ sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "先想" } }, "run_1"),
    [{ type: "reasoning.delta", runId: "run_1", text: "先想" }]
  )
  assert.deepEqual(
    mapAcpUpdate({ sessionUpdate: "agent_message_chunk", content: { text: "你好" } }, "run_1"),
    [{ type: "text.delta", runId: "run_1", text: "你好" }]
  )
})

test("maps tool call and path locations", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "edit",
      rawInput: { path: "a.ts" },
      locations: [{ path: "a.ts" }]
    },
    "run_1"
  )
  assert.equal(events[0]?.type, "tool.start")
  assert.equal(events[1]?.type, "file.changed")
})

test("弱 title command + locations 推断为 read_file", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t2",
      title: "command",
      rawInput: { path: "README.md" },
      locations: [{ path: "README.md" }]
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") assert.equal(start.name, "read_file")
})

test("kind=read 即使 title 是 command 也当读文件", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t3",
      title: "command",
      kind: "read",
      locations: [{ path: "src/app/page.tsx" }]
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "read_file")
    assert.equal(asPath(start.args), "src/app/page.tsx")
  }
})

test("Edit File 标题不能当成 path File", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t5",
      title: "Edit File",
      kind: "edit",
      locations: [{ path: "src/app/layout.tsx" }]
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "edit_file")
    assert.equal(asPath(start.args), "src/app/layout.tsx")
  }
})

test("嵌套 args.path 也能抽出", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call_update",
      toolCallId: "t6",
      title: "Read File",
      kind: "read",
      rawInput: { args: { path: "README.md" } },
      status: "in_progress"
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") assert.equal(asPath(start.args), "README.md")
})

test("有 diff 内容的 locations 才是 edit_file", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t4",
      title: "command",
      rawInput: { path: "a.ts", content: "x" },
      locations: [{ path: "a.ts" }]
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") assert.equal(start.name, "edit_file")
})

function asPath(args: unknown): string {
  return args && typeof args === "object" && "path" in args ? String((args as { path: unknown }).path) : ""
}

test("弱 title command + argv 推断为 bash", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t7",
      title: "command",
      rawInput: { argv: ["git", "status"] }
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "bash")
    const args = start.args as { argv?: string[] }
    assert.deepEqual(args.argv, ["git", "status"])
  }
})

test("permission options map allow / deny / session", () => {
  const options = [
    { optionId: "allow-once", kind: "allow_once" },
    { optionId: "allow-always", kind: "allow_always" },
    { optionId: "reject-once", kind: "reject_once" }
  ]
  assert.deepEqual(pickAcpPermissionOption("allow", options), {
    outcome: "selected",
    optionId: "allow-once"
  })
  assert.deepEqual(pickAcpPermissionOption("allow_session", options), {
    outcome: "selected",
    optionId: "allow-always"
  })
  assert.deepEqual(pickAcpPermissionOption("deny", options), {
    outcome: "selected",
    optionId: "reject-once"
  })
})
