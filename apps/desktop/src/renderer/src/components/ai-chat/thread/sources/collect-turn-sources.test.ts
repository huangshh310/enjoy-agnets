import assert from "node:assert/strict"
import { test } from "node:test"
import { collectTurnSources } from "./collect-turn-sources.ts"

test("cited + read_file + edit_file + skill 收成芯片并去重", () => {
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
        },
        {
          id: "t3",
          name: "edit_file",
          state: "output-available",
          args: { path: "src/auth/LoginForm.tsx" }
        }
      ]
    },
    (name) => `技能 · ${name}`
  )
  assert.equal(chips.some((chip) => chip.kind === "file" && chip.label.includes("login.ts")), true)
  assert.equal(chips.some((chip) => chip.kind === "skill" && chip.label.includes("读代码")), true)
  assert.equal(chips.filter((chip) => chip.path === "src/auth/login.ts").length, 1)
  assert.equal(chips.some((chip) => chip.path === "src/auth/LoginForm.tsx"), true)
})

test("MCP 工具收成服务器芯片，同服务器去重；网页 URL 丢掉", () => {
  const chips = collectTurnSources(
    {
      sources: [{ sourceId: "web", title: "https://example.com/a", path: "https://example.com/a" }],
      tools: [
        { id: "m1", name: "mcp_filesystem__read_file", state: "output-available", args: {} },
        { id: "m2", name: "mcp_filesystem__list_dir", state: "output-available", args: {} },
        { id: "m3", name: "mcp_github__search", state: "output-available", args: {} }
      ]
    },
    (name) => `技能 · ${name}`
  )
  const mcp = chips.filter((chip) => chip.kind === "mcp")
  assert.equal(mcp.length, 2)
  assert.deepEqual(
    mcp.map((chip) => chip.title).sort(),
    ["filesystem", "github"]
  )
  assert.equal(chips.some((chip) => chip.path?.startsWith("http")), false)
})
