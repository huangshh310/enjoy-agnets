import assert from "node:assert/strict"
import { test } from "node:test"
import {
  classifySourceKind,
  formatSourceChipLabel,
  parseMcpServerId,
  splitVisibleSourceChips
} from "./source-chip.ts"

test("三例形态：文件行号、文档名、技能短名", () => {
  assert.equal(classifySourceKind({ path: "src/auth/login.ts" }), "file")
  assert.equal(classifySourceKind({ path: "docs/login.md", title: "登录流程说明" }), "doc")
  assert.equal(classifySourceKind({ path: ".agents/skills/read/SKILL.md", title: "读代码" }), "skill")
  assert.equal(
    formatSourceChipLabel(
      { kind: "file", path: "src/auth/login.ts", startLine: 42 },
      (name) => `技能 · ${name}`
    ),
    "src/auth/login.ts · L42"
  )
  assert.equal(
    formatSourceChipLabel({ kind: "doc", title: "登录流程说明", path: "docs/login.md" }, (n) => n),
    "登录流程说明"
  )
  assert.equal(
    formatSourceChipLabel({ kind: "skill", title: "读代码" }, (name) => `技能 · ${name}`),
    "技能 · 读代码"
  )
})

test("知识库 cite 独立成 knowledge，不跟文件抢 key", () => {
  assert.equal(classifySourceKind({ path: "src/auth/login.ts", fromKnowledge: true }), "knowledge")
  assert.equal(
    formatSourceChipLabel({ kind: "knowledge", title: "login.ts", path: "src/auth/login.ts" }, (n) => n),
    "login.ts"
  )
})

test("MCP 工具名收成服务器芯片，不当文件", () => {
  assert.equal(parseMcpServerId("mcp_filesystem__read_file"), "filesystem")
  assert.equal(parseMcpServerId("mcp_mcp_ab__list_dir"), "mcp_ab")
  assert.equal(parseMcpServerId("read_file"), null)
  assert.equal(classifySourceKind({ toolName: "mcp_github__search" }), "mcp")
  assert.equal(
    formatSourceChipLabel({ kind: "mcp", title: "filesystem" }, (n) => n),
    "filesystem"
  )
})

test("密度锁 4 颗可见其余 +N", () => {
  const { shown, rest } = splitVisibleSourceChips([1, 2, 3, 4, 5, 6])
  assert.deepEqual(shown, [1, 2, 3, 4])
  assert.equal(rest, 2)
  assert.equal(splitVisibleSourceChips([1, 2, 3]).rest, 0)
})
