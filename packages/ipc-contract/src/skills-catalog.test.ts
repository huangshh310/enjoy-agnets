import assert from "node:assert/strict"
import { test } from "node:test"
import type { SkillItem } from "./skills.ts"
import {
  formatSkillCatalog,
  pickSkillCatalog,
  skillWorkspaceRelPath
} from "./skills-catalog.ts"

function skill(partial: Partial<SkillItem> & Pick<SkillItem, "id" | "name">): SkillItem {
  return {
    scope: "workspace",
    directoryPath: `/ws/.agents/skills/${partial.name}`,
    skillFilePath: `/ws/.agents/skills/${partial.name}/SKILL.md`,
    ...partial
  }
}

test("工作区内技能给出相对路径，工作区外没有 path", () => {
  assert.equal(
    skillWorkspaceRelPath("/ws/.agents/skills/grill-me/SKILL.md", "/ws"),
    ".agents/skills/grill-me/SKILL.md"
  )
  assert.equal(skillWorkspaceRelPath("/Users/me/.agents/skills/x/SKILL.md", "/ws"), undefined)
})

test("目录含名称与描述，不含 SKILL.md 正文", () => {
  const text = formatSkillCatalog(
    [
      skill({
        id: "w:grill",
        name: "grill-me",
        description: "Stress-test a plan",
        trigger: "/grill",
        content: "# full body that must not appear"
      }),
      skill({
        id: "g:tdd",
        name: "tdd",
        scope: "global",
        directoryPath: "/Users/me/.agents/skills/tdd",
        skillFilePath: "/Users/me/.agents/skills/tdd/SKILL.md",
        description: "Red-green-refactor",
        content: "SECRET BODY"
      })
    ],
    { workspaceRoot: "/ws" }
  )
  assert.ok(text.includes("grill-me"))
  assert.ok(text.includes("path: .agents/skills/grill-me/SKILL.md"))
  assert.ok(text.includes("Stress-test a plan"))
  assert.ok(text.includes("tdd (global)"))
  assert.ok(text.includes("path: (outside workspace)"))
  assert.ok(!text.includes("full body"))
  assert.ok(!text.includes("SECRET BODY"))
})

test("工作区技能排在全局前面，同路径去重", () => {
  const picked = pickSkillCatalog([
    skill({
      id: "g",
      name: "alpha",
      scope: "global",
      directoryPath: "/home/.agents/skills/alpha",
      skillFilePath: "/home/.agents/skills/alpha/SKILL.md"
    }),
    skill({ id: "w", name: "zeta", description: "ws" }),
    skill({ id: "dup", name: "zeta", description: "dup" })
  ])
  assert.equal(picked[0]?.name, "zeta")
  assert.equal(picked.length, 2)
})

test("空表不输出标题", () => {
  assert.equal(formatSkillCatalog([]), "")
})
