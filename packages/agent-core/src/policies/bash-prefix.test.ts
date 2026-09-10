import assert from "node:assert/strict"
import { test } from "node:test"
import { bashAllowPrefix, sessionAllowsBash } from "./bash-prefix.ts"

test("前缀取前两个 token", () => {
  assert.equal(bashAllowPrefix("git status --porcelain"), "git status")
  assert.equal(bashAllowPrefix("ls"), "ls")
  assert.equal(bashAllowPrefix("  pnpm   test  --watch"), "pnpm test")
})

test("本会话只放行匹配前缀", () => {
  const allowed = ["git status", "pnpm test"]
  assert.equal(sessionAllowsBash("git status -sb", allowed), true)
  assert.equal(sessionAllowsBash("git push origin main", allowed), false)
  assert.equal(sessionAllowsBash("pnpm test src/a.ts", allowed), true)
  assert.equal(sessionAllowsBash("curl https://x", allowed), false)
})
