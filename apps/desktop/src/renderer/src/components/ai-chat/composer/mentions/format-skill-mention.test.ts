import assert from "node:assert/strict"
import { test } from "node:test"
import { formatSkillMention, formatSkillMentions } from "./format-skill-mention.ts"

test("工作区技能写出相对路径，不点名 Local 工具", () => {
  const text = formatSkillMention({
    id: "s",
    name: "Summarize",
    slash: "summarize",
    scope: "workspace",
    relPath: ".agents/skills/summarize/SKILL.md"
  })
  assert.match(text, /\/summarize/)
  assert.match(text, /\.agents\/skills\/summarize\/SKILL\.md/)
  assert.match(text, /Read that SKILL\.md/)
  assert.doesNotMatch(text, /read_file/)
  assert.doesNotMatch(text, /# Summarize/)
})

test("全局技能不编造工作区外路径", () => {
  const text = formatSkillMention({
    id: "g",
    name: "Deep Research",
    slash: "deep-research",
    scope: "global"
  })
  assert.match(text, /outside the opened folder/)
  assert.doesNotMatch(text, /path:/)
})

test("多技能按选中顺序拼接", () => {
  const block = formatSkillMentions([
    { id: "a", name: "A", slash: "a", scope: "global" },
    { id: "b", name: "B", slash: "b", scope: "workspace", relPath: "b/SKILL.md" }
  ])
  assert.match(block, /\/a[\s\S]*\/b/)
})
