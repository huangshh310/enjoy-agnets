import assert from "node:assert/strict"
import { test } from "node:test"
import { filterMentionItems, skillSlashToken, slugSkillName } from "./mention-items.ts"

test("技能呼号优先 trigger，空格名称没有合法 /", () => {
  assert.equal(skillSlashToken({ name: "Deep Research", trigger: "deep-research" }), "deep-research")
  assert.equal(skillSlashToken({ name: "Summarize" }), "summarize")
  assert.equal(skillSlashToken({ name: "代码 审查" }), null)
})

test("过滤同时看文件路径和技能名", () => {
  const items = [
    { kind: "file" as const, id: "f", path: "apps/desktop/package.json", name: "package.json", entryKind: "file" as const },
    {
      kind: "skill" as const,
      id: "s",
      skill: { id: "s", name: "Summarize", slash: "summarize", scope: "global" as const }
    }
  ]
  assert.equal(filterMentionItems(items, "pack").length, 1)
  assert.equal(filterMentionItems(items, "/summ").length, 1)
  assert.equal(slugSkillName("Deep Research"), "deep-research")
})

test("过滤也看内置命令名", () => {
  const items = [
    {
      kind: "command" as const,
      id: "command:compact",
      name: "compact",
      description: "Summarize older context",
      tag: "Built-in"
    }
  ]
  assert.equal(filterMentionItems(items, "comp").length, 1)
  assert.equal(filterMentionItems(items, "plan").length, 0)
})
