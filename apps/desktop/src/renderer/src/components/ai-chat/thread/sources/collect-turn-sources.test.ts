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

test("弱名 command 带 path 进文件芯片；todo_write 与纯 bash 不进", () => {
  const chips = collectTurnSources(
    {
      tools: [
        { id: "t1", name: "command", state: "output-available", args: { path: "src/app.css" } },
        { id: "t2", name: "todo_write", state: "output-available", args: { todos: [] } },
        { id: "t3", name: "bash", state: "output-available", args: { command: "pnpm lint" } }
      ]
    },
    (name) => `技能 · ${name}`
  )
  assert.equal(chips.length, 1)
  assert.equal(chips[0]?.path, "src/app.css")
})

test("脏仓未碰的 readme/untracked 不进标签；读文件进；知识库 cite 独立样式", () => {
  const chips = collectTurnSources(
    {
      sources: [{ sourceId: "k1", title: "验收清单", path: "docs/review.md" }],
      tools: [
        {
          id: "t1",
          name: "read_file",
          state: "output-available",
          args: { path: "src/auth.ts" }
        },
        {
          id: "t2",
          name: "write_file",
          state: "output-available",
          args: { path: "note.txt" }
        }
      ]
    },
    (name) => `技能 · ${name}`
  )
  assert.equal(chips.some((chip) => chip.path === "readme.md"), false)
  assert.equal(chips.some((chip) => chip.path === "untracked.txt"), false)
  const read = chips.find((chip) => chip.path === "src/auth.ts")
  assert.equal(read?.kind, "file")
  const written = chips.find((chip) => chip.path === "note.txt")
  assert.ok(written)
  assert.notEqual(written?.kind, "knowledge")
  const knowledge = chips.find((chip) => chip.path === "docs/review.md")
  assert.equal(knowledge?.kind, "knowledge")
  assert.equal(knowledge?.label.includes("验收清单"), true)
})

test("Enjoy 注入行标 fromEnjoy；空注入不造假行", () => {
  const empty = collectTurnSources({ hostInject: { mcp: [], skills: [] } }, (name) => `技能 · ${name}`)
  assert.equal(empty.length, 0)
  const chips = collectTurnSources(
    { hostInject: { mcp: ["Filesystem"], skills: ["form-a11y"] } },
    (name) => `技能 · ${name}`
  )
  const enjoy = chips.filter((chip) => chip.fromEnjoy)
  assert.equal(enjoy.length, 2)
  assert.equal(chips.some((chip) => chip.kind === "mcp" && chip.title === "Filesystem"), true)
  assert.equal(chips.some((chip) => chip.kind === "skill" && chip.title === "form-a11y"), true)
})
