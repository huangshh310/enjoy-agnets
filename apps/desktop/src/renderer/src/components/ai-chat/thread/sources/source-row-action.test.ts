import assert from "node:assert/strict"
import { test } from "node:test"
import type { TurnSourceChip } from "./source-chip.ts"
import {
  canActivateSourceRow,
  isWorkspaceRelPath,
  planSourceRowClick,
  sourceChipStableId
} from "./source-row-action.ts"

const fileChip: TurnSourceChip = {
  id: "f1",
  kind: "file",
  label: "login.ts · L42",
  path: "src/auth/login.ts",
  startLine: 42
}

const knowledgeOk: TurnSourceChip = {
  id: "k1",
  kind: "knowledge",
  label: "readme.md",
  path: "readme.md",
  startLine: 1,
  snippet: "hello knowledge"
}

const knowledgeMissing: TurnSourceChip = {
  id: "k2",
  kind: "knowledge",
  label: "gone.md",
  path: "gone.md",
  startLine: 1,
  snippet: "already deleted"
}

const knowledgeEscape: TurnSourceChip = {
  id: "k3",
  kind: "knowledge",
  label: "secret",
  path: "../secret.md",
  snippet: "outside"
}

const skillChip: TurnSourceChip = {
  id: "s1",
  kind: "skill",
  label: "技能 · 读代码",
  path: "skills/read-code/SKILL.md"
}

test("工作区相对路径才打开，盘符 / .. / URL 拒绝", () => {
  assert.equal(isWorkspaceRelPath("readme.md"), true)
  assert.equal(isWorkspaceRelPath("docs/a.md"), true)
  assert.equal(isWorkspaceRelPath(""), false)
  assert.equal(isWorkspaceRelPath("../x.md"), false)
  assert.equal(isWorkspaceRelPath("foo/../x.md"), false)
  assert.equal(isWorkspaceRelPath("C:/tmp/a.md"), false)
  assert.equal(isWorkspaceRelPath("/etc/passwd"), false)
  assert.equal(isWorkspaceRelPath("https://example.com/a"), false)
})

test("知识库行：文件在则打开到行，不在或非工作区路径则展开片段", () => {
  assert.deepEqual(planSourceRowClick(knowledgeOk, true), {
    action: "open",
    path: "readme.md",
    startLine: 1
  })
  assert.deepEqual(planSourceRowClick(knowledgeMissing, false), { action: "expand" })
  assert.deepEqual(planSourceRowClick(knowledgeEscape, true), { action: "expand" })
  assert.deepEqual(planSourceRowClick(fileChip, true), {
    action: "open",
    path: "src/auth/login.ts",
    startLine: 42
  })
  assert.deepEqual(planSourceRowClick(skillChip, true), { action: "none" })
})

test("知识库行可点；技能不可点", () => {
  assert.equal(canActivateSourceRow(knowledgeOk), true)
  assert.equal(canActivateSourceRow(knowledgeMissing), true)
  assert.equal(canActivateSourceRow(fileChip), true)
  assert.equal(canActivateSourceRow(skillChip), false)
})

test("同一知识库来源的两文件 id 不撞车", () => {
  const a = sourceChipStableId({ sourceId: "src-folder", path: "readme.md", startLine: 1 })
  const b = sourceChipStableId({ sourceId: "src-folder", path: "untracked.txt", startLine: 1 })
  assert.notEqual(a, b)
  assert.equal(a, "readme.md:1")
  assert.equal(b, "untracked.txt:1")
})
