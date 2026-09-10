import assert from "node:assert/strict"
import { test } from "node:test"
import { createSkillTool, type SkillHost } from "./skill-tool.ts"

function host(): SkillHost {
  return {
    list: () => [
      { name: "tdd", scope: "global", description: "Red-green-refactor" },
      { name: "grill-me", scope: "workspace", description: "Stress-test a plan" }
    ],
    read: async (name) => {
      if (name.toLowerCase() !== "tdd") throw new Error(`Unknown skill: ${name}`)
      return { name: "tdd", scope: "global", content: "# TDD\nWrite a failing test first." }
    }
  }
}

test("skill 工具描述列出索引且不含正文", () => {
  const tools = createSkillTool(host())
  const description = String(tools.skill.description ?? "")
  assert.ok(description.includes("tdd"))
  assert.ok(description.includes("grill-me"))
  assert.ok(!description.includes("Write a failing test"))
})

test("skill 工具能加载全局技能正文", async () => {
  const tools = createSkillTool(host())
  const execute = tools.skill.execute as (input: { name: string }) => Promise<{
    name: string
    content: string
  }>
  const loaded = await execute({ name: "tdd" })
  assert.equal(loaded.name, "tdd")
  assert.ok(loaded.content.includes("failing test"))
})
