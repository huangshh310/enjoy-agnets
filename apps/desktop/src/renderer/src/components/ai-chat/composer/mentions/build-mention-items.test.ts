import assert from "node:assert/strict"
import { test } from "node:test"
import { buildSlashMentionItems, type ModeCopy, type SlashBuiltinCopy } from "./build-mention-items.ts"
import { rememberSkillCatalog, takeComposerSkillChips } from "./composer-skill-chips.ts"

const copy: ModeCopy = {
  agent: { label: "Agent", description: "write" },
  plan: { label: "Plan", description: "read" },
  ask: { label: "Ask", description: "q" },
  debug: { label: "Debug", description: "fix" }
}

const builtin: SlashBuiltinCopy = {
  compactDescription: "Summarize older context",
  builtinTag: "Built-in"
}

test("斜杠始终列出 compact、plan 与已安装技能", () => {
  takeComposerSkillChips()
  rememberSkillCatalog(
    [
      {
        id: "s",
        name: "Summarize",
        scope: "global",
        directoryPath: "/skills/summarize",
        skillFilePath: "/skills/summarize/SKILL.md"
      }
    ],
    "/repo"
  )
  const items = buildSlashMentionItems("", copy, builtin)
  assert.equal(
    items.some((item) => item.kind === "command" && item.name === "compact"),
    true
  )
  assert.equal(
    items.some((item) => item.kind === "mode" && item.mode === "plan"),
    true
  )
  assert.equal(
    items.some((item) => item.kind === "skill" && item.skill.slash === "summarize"),
    true
  )
  const compactIndex = items.findIndex((item) => item.kind === "command")
  const planIndex = items.findIndex((item) => item.kind === "mode" && item.mode === "plan")
  const skillIndex = items.findIndex((item) => item.kind === "skill")
  assert.ok(compactIndex < planIndex && planIndex < skillIndex)
})

test("查询 compact 只命中压缩命令", () => {
  takeComposerSkillChips()
  const items = buildSlashMentionItems("comp", copy, builtin)
  assert.equal(items.length, 1)
  assert.equal(items[0]?.kind, "command")
})
