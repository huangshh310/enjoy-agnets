import assert from "node:assert/strict"
import { test } from "node:test"
import { systemPromptFor } from "@enjoy-agents/agent-core/prompts"
import {
  codingInstructions,
  extraLocalInstructions,
  formatCustomInstructions,
  inspectListedToolNames
} from "./inspect-prompt-instructions.ts"

test("local 拼自定义说明与常驻规则，丢掉带 glob 的 contextual", () => {
  const text = codingInstructions("agent", "local", "Prefer small diffs.", [
    {
      id: "a",
      name: "AGENTS.md Contract",
      agentKind: "agents_md",
      agentKindLabel: "AGENTS.md",
      scope: "workspace",
      filePath: "/ws/AGENTS.md",
      content: "Keep files under 300 lines."
    },
    {
      id: "c",
      name: "tsx-only",
      agentKind: "cursor_mdc",
      agentKindLabel: "Cursor MDC",
      scope: "contextual",
      filePath: "/ws/.cursor/rules/tsx.mdc",
      globs: "*.tsx",
      content: "should not appear"
    }
  ])
  assert.ok(text.startsWith(systemPromptFor("agent")))
  assert.ok(text.includes("Prefer small diffs."))
  assert.ok(text.includes("Keep files under 300 lines."))
  assert.ok(!text.includes("should not appear"))
})

test("acp-host 不假装注入 ToolLoop 系统提示", () => {
  const text = codingInstructions("plan", "acp-host", "Speak Chinese.")
  assert.ok(!text.includes(systemPromptFor("plan")))
  assert.ok(text.includes("session/prompt"))
  assert.ok(text.includes("Speak Chinese."))
})

test("harness 只拼自定义说明", () => {
  const text = codingInstructions("ask", "harness", "No secrets.", [
    {
      id: "a",
      name: "AGENTS.md Contract",
      agentKind: "agents_md",
      agentKindLabel: "AGENTS.md",
      scope: "workspace",
      filePath: "/ws/AGENTS.md",
      content: "workspace rule"
    }
  ])
  assert.ok(text.includes(systemPromptFor("ask")))
  assert.ok(text.includes("No secrets."))
  assert.ok(!text.includes("workspace rule"))
})

test("local 拼技能索引，不含 SKILL.md 正文", () => {
  const text = codingInstructions("agent", "local", "", [], {
    workspaceRoot: "/ws",
    skills: [
      {
        id: "w:grill",
        name: "grill-me",
        description: "Stress-test a plan",
        scope: "workspace",
        directoryPath: "/ws/.agents/skills/grill-me",
        skillFilePath: "/ws/.agents/skills/grill-me/SKILL.md",
        content: "# must not appear"
      }
    ]
  })
  assert.ok(text.includes("grill-me"))
  assert.ok(text.includes("path: .agents/skills/grill-me/SKILL.md"))
  assert.ok(!text.includes("must not appear"))
})

test("extraLocalInstructions 空输入为空串", () => {
  assert.equal(extraLocalInstructions({ customInstructions: "  " }), "")
  assert.equal(formatCustomInstructions(""), "")
})

test("ACP / e2e 检查器不列 Enjoy 写工具名", () => {
  const local = ["write_file", "read_file"]
  assert.deepEqual(inspectListedToolNames("local", local), local)
  assert.deepEqual(inspectListedToolNames("acp-host", local), [])
  assert.deepEqual(inspectListedToolNames("e2e", local), [])
})
