import assert from "node:assert/strict"
import { test } from "node:test"
import { mapAcpUpdate } from "./map-events.ts"
import { pickAcpPermissionOption } from "./permissions.ts"

test("maps MCP App HTML resource to mcp.app", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call_update",
      toolCallId: "ui1",
      status: "completed",
      content: [
        {
          type: "resource",
          mimeType: "text/html;profile=mcp-app",
          uri: "ui://dashboard",
          text: "<!doctype html><html><body><p>hi</p></body></html>"
        }
      ]
    },
    "run_1"
  )
  const app = events.find((item) => item.type === "mcp.app") as
    | { type: "mcp.app"; resourceUri?: string; srcDoc?: string }
    | undefined
  assert.equal(app?.type, "mcp.app")
  assert.equal(app?.resourceUri, "ui://dashboard")
  assert.ok(app?.srcDoc?.includes("<p>hi</p>"))
})

test("maps plan snapshot to todo_write", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "plan",
      entries: [
        { content: "读入口", status: "completed" },
        { content: "改 auth", status: "in_progress" }
      ]
    },
    "run_1"
  )
  assert.equal(events[0]?.type, "tool.start")
  assert.equal(events[1]?.type, "tool.result")
  const start = events[0] as { name?: string; args?: { todos?: Array<{ title: string; status: string }> } }
  assert.equal(start.name, "todo_write")
  assert.equal(start.args?.todos?.[1]?.title, "改 auth")
  assert.equal(start.args?.todos?.[1]?.status, "in_progress")
})

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

test("tool_call content type=diff 写入 args 并 file.changed", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t-diff",
      kind: "edit",
      content: [{ type: "diff", path: "src/auth.ts", diff: "@@ -1 +1 @@\n-a\n+b\n" }]
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    const args = start.args as { path?: string; diff?: string }
    assert.equal(args.path, "src/auth.ts")
    assert.ok(args.diff?.includes("+b"))
  }
  assert.ok(events.some((event) => event.type === "file.changed"))
})

test("available_commands_update 进 commands.update，不进气泡", () => {
  const events = mapAcpUpdate(
    { sessionUpdate: "available_commands_update", availableCommands: [{ name: "plan", description: "Plan" }] },
    "run_1"
  )
  assert.equal(events[0]?.type, "commands.update")
  if (events[0]?.type === "commands.update") {
    assert.equal(events[0].commands[0]?.name, "plan")
  }
})

test("usage_update 带上窗口 size", () => {
  const events = mapAcpUpdate({ sessionUpdate: "usage_update", used: 2200, size: 200000 }, "run_1")
  assert.equal(events[0]?.type, "usage.updated")
  if (events[0]?.type === "usage.updated") {
    assert.equal(events[0].inputTokens, 2200)
    assert.equal(events[0].contextWindow, 200000)
    assert.equal(events[0].reportedCostUsd, undefined)
  }
})

test("usage_update 上报花费原样带上，没上报不编造", () => {
  const reported = mapAcpUpdate(
    { sessionUpdate: "usage_update", used: 10, costUsd: 1.2 },
    "run_1"
  )
  assert.equal(reported[0]?.type, "usage.updated")
  if (reported[0]?.type === "usage.updated") {
    assert.equal(reported[0].reportedCostUsd, 1.2)
  }
  const hidden = mapAcpUpdate({ sessionUpdate: "usage_update", used: 10 }, "run_1")
  if (hidden[0]?.type === "usage.updated") {
    assert.equal(hidden[0].reportedCostUsd, undefined)
  }
})

test("usage_update 拒绝负数花费和非 USD", () => {
  const negative = mapAcpUpdate(
    { sessionUpdate: "usage_update", used: 10, costUsd: -1.2 },
    "run_1"
  )
  if (negative[0]?.type === "usage.updated") {
    assert.equal(negative[0].reportedCostUsd, undefined)
  }
  const euro = mapAcpUpdate(
    { sessionUpdate: "usage_update", used: 10, cost: { amount: 2, currency: "EUR" } },
    "run_1"
  )
  if (euro[0]?.type === "usage.updated") {
    assert.equal(euro[0].reportedCostUsd, undefined)
  }
})

test("session_info_update 进 session.title", () => {
  const events = mapAcpUpdate(
    { sessionUpdate: "session_info_update", title: "Implement session list" },
    "run_1"
  )
  assert.equal(events[0]?.type, "session.title")
  if (events[0]?.type === "session.title") assert.equal(events[0].title, "Implement session list")
})

test("config_option_update 进 session.config", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "config_option_update",
      configOptions: [
        {
          id: "reasoning_effort",
          name: "Effort",
          category: "thought_level",
          currentValue: "high",
          options: [
            { value: "low", name: "Low" },
            { value: "high", name: "High" }
          ]
        }
      ]
    },
    "run_1"
  )
  assert.equal(events[0]?.type, "session.config")
  if (events[0]?.type === "session.config") {
    assert.equal(events[0].configOptions[0]?.id, "reasoning_effort")
  }
})

test("kind=task 归一成 delegate", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "d1",
      kind: "task",
      title: "审查架构与 IPC 完整性"
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "delegate")
    const args = start.args as { title?: string }
    assert.equal(args.title, "审查架构与 IPC 完整性")
  }
})

test("标题 Explore 归一成 delegate 并写入 kind=explore", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "d2",
      title: "Explore ipc contract",
      rawInput: { task: "review ipc" }
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "delegate")
    const args = start.args as { kind?: string; task?: string; title?: string }
    assert.equal(args.kind, "explore")
    assert.equal(args.task, "review ipc")
    assert.equal(args.title, undefined)
  }
})

test("Explore 标题配字符串 rawInput 时保留原文", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "d-str",
      title: "Explore routing",
      rawInput: "please review src/app routes"
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "delegate")
    const args = start.args as { kind?: string; prompt?: string; title?: string }
    assert.equal(args.kind, "explore")
    assert.equal(args.prompt, "please review src/app routes")
    assert.equal(args.title, undefined)
  }
})

test("Explore 标题无 input 时去掉前缀再当 title", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "d3",
      title: "Explore architecture review"
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") {
    assert.equal(start.name, "delegate")
    const args = start.args as { kind?: string; title?: string }
    assert.equal(args.kind, "explore")
    assert.equal(args.title, "architecture review")
  }
})

test("ACP completed 写工具发 tool.result，fold 后是 output-available", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call_update",
      toolCallId: "t-write",
      title: "Write File",
      kind: "edit",
      rawInput: { path: "note.txt", content: "x" },
      status: "completed"
    },
    "run_1"
  )
  const result = events.find((event) => event.type === "tool.result")
  assert.equal(result?.type, "tool.result")
  if (result?.type === "tool.result") assert.equal(result.error, undefined)
})

test("有 parentToolCallId 则转发到 tool.start / tool.result", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call_update",
      toolCallId: "t-child",
      title: "Read File",
      kind: "read",
      parentToolCallId: "d1",
      rawInput: { path: "a.ts" },
      status: "completed"
    },
    "run_1"
  )
  const start = events.find((event) => event.type === "tool.start")
  const result = events.find((event) => event.type === "tool.result")
  assert.equal(start?.type, "tool.start")
  assert.equal(result?.type, "tool.result")
  if (start?.type === "tool.start") assert.equal(start.parentToolCallId, "d1")
  if (result?.type === "tool.result") assert.equal(result.parentToolCallId, "d1")
})

test("无 parentToolCallId 时不编造嵌套", () => {
  const events = mapAcpUpdate(
    {
      sessionUpdate: "tool_call",
      toolCallId: "t-flat",
      title: "Read File",
      kind: "read",
      rawInput: { path: "a.ts" }
    },
    "run_1"
  )
  const start = events[0]
  assert.equal(start?.type, "tool.start")
  if (start?.type === "tool.start") assert.equal(start.parentToolCallId, undefined)
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
