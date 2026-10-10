/**
 * stub 不得偷偷把工作区编进知识库，否则 hello 会冒出「知识库 readme.md」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "e2e-bootstrap.ts"), "utf8")

test("stub 启动不自动 addKnowledgeSource 工作区根", () => {
  assert.doesNotMatch(src, /addKnowledgeSource/)
  assert.doesNotMatch(src, /indexKnowledgeSource/)
})

test("重开同一 userData 不重复种会话", () => {
  assert.match(src, /if \(existing\.length > 0\) return/)
})
