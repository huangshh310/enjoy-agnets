import assert from "node:assert/strict"
import { test } from "node:test"
import type { TurnSourceChip } from "./source-chip.ts"
import { canFocusSourceRow, sourceBadgeKind, sourceRowName, sourceRowProvenance } from "./source-detail.ts"

const fileChip: TurnSourceChip = {
  id: "f1",
  kind: "file",
  label: "src/auth/login.ts · L42",
  path: "src/auth/login.ts",
  startLine: 42,
  title: "src/auth/login.ts"
}

const docChip: TurnSourceChip = {
  id: "d1",
  kind: "doc",
  label: "登录流程说明",
  path: "docs/login.md",
  title: "登录流程说明"
}

const skillChip: TurnSourceChip = {
  id: "s1",
  kind: "skill",
  label: "技能 · 读代码",
  path: "skills/read-code/SKILL.md",
  title: "读代码"
}

const mcpChip: TurnSourceChip = {
  id: "m1",
  kind: "mcp",
  label: "filesystem",
  title: "filesystem"
}

test("类型标只有文件 / 技能 / MCP，文档并进文件", () => {
  assert.equal(sourceBadgeKind("file"), "file")
  assert.equal(sourceBadgeKind("doc"), "file")
  assert.equal(sourceBadgeKind("skill"), "skill")
  assert.equal(sourceBadgeKind("mcp"), "mcp")
})

test("行列：名称是短名，出处是 path 或服务器", () => {
  assert.equal(sourceRowName(fileChip), "login.ts")
  assert.equal(sourceRowProvenance(fileChip, mcp), "src/auth/login.ts · L42")
  assert.equal(sourceRowName(docChip), "登录流程说明")
  assert.equal(sourceRowProvenance(docChip, mcp), "docs/login.md")
  assert.equal(sourceRowName(skillChip), "读代码")
  assert.equal(sourceRowProvenance(skillChip, mcp), "skills/read-code/SKILL.md")
  assert.equal(sourceRowName(mcpChip), "filesystem")
  assert.equal(sourceRowProvenance(mcpChip, mcp), "服务器 · filesystem")
})

test("只有带 path 的文件行可聚焦，技能 / MCP 不跳转", () => {
  assert.equal(canFocusSourceRow(fileChip), true)
  assert.equal(canFocusSourceRow(docChip), true)
  assert.equal(canFocusSourceRow({ ...fileChip, path: undefined }), false)
  assert.equal(canFocusSourceRow(skillChip), false)
  assert.equal(canFocusSourceRow(mcpChip), false)
})

function mcp(name: string): string {
  return `服务器 · ${name}`
}
