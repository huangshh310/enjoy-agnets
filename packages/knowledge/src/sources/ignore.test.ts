import assert from "node:assert/strict"
import { test } from "node:test"
import { parseGitignore, shouldIgnore } from "./ignore.ts"

test("默认排除 git / node_modules / 密钥", () => {
  assert.equal(shouldIgnore(".git/config"), true)
  assert.equal(shouldIgnore("node_modules/ai/index.js"), true)
  assert.equal(shouldIgnore(".env"), true)
  assert.equal(shouldIgnore("secrets/id_rsa"), true)
  assert.equal(shouldIgnore("src/index.ts"), false)
})

test("尊重 .gitignore 模式", () => {
  const extra = parseGitignore("dist\n*.log\n")
  assert.equal(shouldIgnore("dist/app.js", extra), true)
  assert.equal(shouldIgnore("debug.log", extra), true)
})
