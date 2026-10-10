/**
 * stub 默认不得偷偷把工作区编进知识库；只有 ENJOY_E2E_KNOWLEDGE=1 才索引根。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "e2e-bootstrap.ts"), "utf8")

test("stub 启动默认不自动 addKnowledgeSource 工作区根", () => {
  assert.match(src, /ENJOY_E2E_KNOWLEDGE/)
  assert.match(src, /addKnowledgeSource/)
  assert.match(src, /process\.env\.ENJOY_E2E_KNOWLEDGE !== "1"/)
  assert.match(src, /isE2eStub\(app\.isPackaged\)/)
})

test("重开同一 userData 不重复种会话", () => {
  assert.match(src, /if \(existing\.length > 0\) return/)
})
