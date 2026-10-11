import assert from "node:assert/strict"
import { test } from "node:test"
import { bashAllowCommand, bashCommandIsInterpreterStyle, sessionAllowsBash } from "./bash-prefix.ts"

test("agent-core 再导出与 ipc-contract 叶子同行为", () => {
  assert.equal(bashAllowCommand("git status --porcelain"), "git status --porcelain")
  assert.equal(sessionAllowsBash("git status --porcelain", ["git status"]), false)
  assert.equal(bashCommandIsInterpreterStyle("bash -lc"), true)
  assert.equal(bashAllowCommand("python script.py"), "")
  assert.equal(sessionAllowsBash("node --eval x", ["node"]), false)
})
