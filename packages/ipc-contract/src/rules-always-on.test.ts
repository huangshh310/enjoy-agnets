import assert from "node:assert/strict"
import { test } from "node:test"
import type { ProjectRuleItem } from "./rules.ts"
import {
  ALWAYS_ON_RULES_CHAR_BUDGET,
  formatAlwaysOnRulePrompt,
  isAlwaysOnRule,
  pickAlwaysOnRules
} from "./rules-always-on.ts"

function rule(partial: Partial<ProjectRuleItem> & Pick<ProjectRuleItem, "id" | "name">): ProjectRuleItem {
  return {
    agentKind: "agents_md",
    agentKindLabel: "AGENTS.md",
    scope: "workspace",
    filePath: "/ws/AGENTS.md",
    ...partial
  }
}

test("workspace / global 无 globs 为常驻", () => {
  assert.equal(isAlwaysOnRule(rule({ id: "a", name: "AGENTS.md", content: "# hi" })), true)
  assert.equal(
    isAlwaysOnRule(
      rule({
        id: "g",
        name: "global",
        scope: "global",
        agentKind: "global",
        filePath: "/home/.enjoy-agents/rules/x.md",
        content: "be concise"
      })
    ),
    true
  )
})

test("带 globs 且未 alwaysApply 的 contextual 不注入", () => {
  assert.equal(
    isAlwaysOnRule(
      rule({
        id: "c",
        name: "tsx-only",
        scope: "contextual",
        agentKind: "cursor_mdc",
        filePath: "/ws/.cursor/rules/tsx.mdc",
        globs: "*.tsx",
        content: "---\nglobs: \"*.tsx\"\n---\nonly tsx"
      })
    ),
    false
  )
})

test("alwaysApply: true 即使有 globs 也注入", () => {
  assert.equal(
    isAlwaysOnRule(
      rule({
        id: "c",
        name: "always",
        scope: "contextual",
        agentKind: "cursor_mdc",
        filePath: "/ws/.cursor/rules/always.mdc",
        globs: "*.md",
        content: "---\nalwaysApply: true\nglobs: \"*.md\"\n---\nalways"
      })
    ),
    true
  )
})

test("无 globs 的 cursor 规则即使标 contextual 也常驻", () => {
  assert.equal(
    isAlwaysOnRule(
      rule({
        id: "c",
        name: "style",
        scope: "contextual",
        agentKind: "cursor_mdc",
        filePath: "/ws/.cursor/rules/style.mdc",
        content: "prefer small diffs"
      })
    ),
    true
  )
})

test("formatAlwaysOnRulePrompt 丢掉 glob 规则并剥 frontmatter", () => {
  const text = formatAlwaysOnRulePrompt([
    rule({
      id: "a",
      name: "AGENTS.md Contract",
      filePath: "/ws/AGENTS.md",
      content: "---\ndescription: x\n---\nKeep files small."
    }),
    rule({
      id: "skip",
      name: "tsx-only",
      scope: "contextual",
      globs: "*.tsx",
      filePath: "/ws/.cursor/rules/tsx.mdc",
      content: "should not appear"
    })
  ])
  assert.ok(text.includes("Keep files small."))
  assert.ok(!text.includes("should not appear"))
  assert.ok(!text.includes("description: x"))
})

test("超预算截断并注明省略", () => {
  const huge = rule({
    id: "a",
    name: "AGENTS.md Contract",
    content: "x".repeat(ALWAYS_ON_RULES_CHAR_BUDGET)
  })
  const extra = rule({
    id: "b",
    name: "other",
    filePath: "/ws/.agents/rules/other.md",
    content: "second"
  })
  const text = formatAlwaysOnRulePrompt([huge, extra], 400)
  assert.ok(text.includes("truncated"))
  assert.ok(!text.includes("second"))
  assert.ok(text.length < 500)
})

test("pickAlwaysOnRules 把 AGENTS.md 排在前面", () => {
  const picked = pickAlwaysOnRules([
    rule({
      id: "g",
      name: "global",
      scope: "global",
      filePath: "/home/.enjoy-agents/rules/g.md",
      content: "g"
    }),
    rule({ id: "a", name: "AGENTS.md Contract", content: "root" })
  ])
  assert.equal(picked[0]?.id, "a")
})
