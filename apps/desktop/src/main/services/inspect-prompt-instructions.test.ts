import assert from "node:assert/strict"
import { test } from "node:test"
import { systemPromptFor } from "@enjoy-agents/agent-core/prompts"
import { REHYDRATED_INSTRUCTIONS_NOTE } from "@enjoy-agents/ipc-contract/agents-md-chain"
import {
  codingInstructions,
  extraLocalInstructions,
  formatCustomInstructions,
  formatPendingSessionContext,
  inspectListedToolNames
} from "./inspect-prompt-instructions.ts"

test("extraLocalInstructions 拼大纲与执行计划 hidden 块", () => {
  const text = extraLocalInstructions({
    customInstructions: "",
    outline: "# Workspace outline\n- apps/",
    executePlan: "# Approved implementation plan\nDo the work."
  })
  assert.ok(text.includes("Workspace outline"))
  assert.ok(text.includes("Approved implementation plan"))
})

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

test("acp-host 不假装注入 ToolLoop 系统提示，但垫技能索引", () => {
  const text = codingInstructions("plan", "acp-host", "Speak Chinese.", [], {
    workspaceRoot: "/ws",
    skills: [
      {
        id: "w:grill",
        name: "grill-me",
        scope: "workspace",
        directoryPath: "/ws/.agents/skills/grill-me",
        skillFilePath: "/ws/.agents/skills/grill-me/SKILL.md",
        description: "Ask clarifying questions"
      }
    ]
  })
  assert.ok(!text.includes(systemPromptFor("plan")))
  assert.ok(text.includes("session/new"))
  assert.ok(text.includes("Speak Chinese."))
  assert.ok(text.includes("grill-me"))
  assert.ok(!text.includes("# Ask clarifying questions"))
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

test("有 AGENTS.md 链时从 always-on 去掉同名文件，避免灌两遍", () => {
  const text = extraLocalInstructions({
    customInstructions: "",
    agentsMd: "# Project instructions (AGENTS.md chain)\nroot from chain",
    rules: [
      {
        id: "a",
        name: "AGENTS.md Contract",
        agentKind: "agents_md",
        agentKindLabel: "AGENTS.md",
        scope: "workspace",
        filePath: "/ws/AGENTS.md",
        content: "duplicate root body"
      },
      {
        id: "b",
        name: "Style",
        agentKind: "cursor_mdc",
        agentKindLabel: "Cursor MDC",
        scope: "workspace",
        filePath: "/ws/.cursor/rules/style.mdc",
        content: "keep this rule"
      }
    ]
  })
  assert.ok(text.includes("root from chain"))
  assert.ok(text.includes("keep this rule"))
  assert.ok(!text.includes("duplicate root body"))
})

test("压缩后 extraInstructions 头注明从磁盘重读", () => {
  const text = extraLocalInstructions({
    customInstructions: "Be brief.",
    rehydratedAfterCompact: true
  })
  assert.ok(text.startsWith(REHYDRATED_INSTRUCTIONS_NOTE))
  assert.ok(text.includes("Be brief."))
})

test("ACP / e2e 检查器不列 Enjoy 写工具名", () => {
  const local = ["write_file", "read_file"]
  assert.deepEqual(inspectListedToolNames("local", local), local)
  assert.deepEqual(inspectListedToolNames("acp-host", local), [])
  assert.deepEqual(inspectListedToolNames("e2e", local), [])
})

test("preview 标注 Goal/Recap 下一轮才注入，空则不写", () => {
  assert.equal(formatPendingSessionContext("", "  "), "")
  const text = formatPendingSessionContext("改登录", "[Enjoy recap kind: heuristic]\n已拆模块")
  assert.match(text, /Next send will inject/)
  assert.match(text, /Goal: 改登录/)
  assert.match(text, /Recap: 已拆模块/)
  assert.doesNotMatch(text, /Enjoy recap kind/)
})
