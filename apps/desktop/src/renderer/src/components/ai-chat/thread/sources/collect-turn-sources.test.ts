import assert from "node:assert/strict"
import { test } from "node:test"
import { collectTurnSources } from "./collect-turn-sources.ts"

test("cited + read_file + skill 收成芯片并去重", () => {
  const chips = collectTurnSources(
    {
      sources: [
        { sourceId: "s1", title: "src/auth/login.ts", path: "src/auth/login.ts", startLine: 42 }
      ],
      tools: [
        {
          id: "t1",
          name: "read_file",
          state: "output-available",
          args: { path: "src/auth/login.ts" }
        },
        {
          id: "t2",
          name: "skill",
          state: "output-available",
          args: { name: "读代码" }
        }
      ]
    },
    (name) => `技能 · ${name}`
  )
  assert.equal(chips.some((chip) => chip.kind === "file" && chip.label.includes("login.ts")), true)
  assert.equal(chips.some((chip) => chip.kind === "skill" && chip.label.includes("读代码")), true)
  assert.equal(chips.filter((chip) => chip.path === "src/auth/login.ts").length, 1)
})
