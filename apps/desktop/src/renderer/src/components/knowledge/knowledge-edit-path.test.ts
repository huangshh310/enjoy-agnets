import assert from "node:assert/strict"
import { test } from "node:test"
import { canSaveKnowledgeSourcePath, isSameKnowledgeSourcePath } from "./knowledge-edit-path.ts"

test("路径没变也能保存，用来 Rebuild", () => {
  assert.equal(canSaveKnowledgeSourcePath("design", false), true)
  assert.equal(isSameKnowledgeSourcePath("design", "design"), true)
})

test("空路径或保存中不能点", () => {
  assert.equal(canSaveKnowledgeSourcePath("  ", false), false)
  assert.equal(canSaveKnowledgeSourcePath("design", true), false)
})

test("改了路径不算同一来源", () => {
  assert.equal(isSameKnowledgeSourcePath("src", "design"), false)
})
