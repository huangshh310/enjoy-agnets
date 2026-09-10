import assert from "node:assert/strict"
import { test } from "node:test"
import {
  addComposerSkillChip,
  listComposerSkillChips,
  listKnownSkills,
  rememberSkillCatalog,
  takeComposerSkillChips
} from "./composer-skill-chips.ts"

test("技能 Chip 去重，take 后清空", () => {
  takeComposerSkillChips()
  const skill = { id: "s", name: "Summarize", slash: "summarize" as const, scope: "global" as const }
  addComposerSkillChip(skill)
  addComposerSkillChip({ ...skill, description: "again" })
  assert.equal(listComposerSkillChips().length, 1)
  assert.equal(takeComposerSkillChips().length, 1)
  assert.equal(listComposerSkillChips().length, 0)
})

test("目录记住工作区内相对路径", () => {
  rememberSkillCatalog(
    [
      {
        id: "s",
        name: "Summarize",
        scope: "workspace",
        directoryPath: "/repo/.agents/skills/summarize",
        skillFilePath: "/repo/.agents/skills/summarize/SKILL.md"
      }
    ],
    "/repo"
  )
  const [item] = listKnownSkills()
  assert.equal(item?.slash, "summarize")
  assert.equal(item?.relPath, ".agents/skills/summarize/SKILL.md")
})
