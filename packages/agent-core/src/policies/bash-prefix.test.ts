import assert from "node:assert/strict"
import { test } from "node:test"
import { bashAllowPrefix, bashCommandIsInterpreterStyle, sessionAllowsBash } from "./bash-prefix.ts"

test("agent-core 再导出与 ipc-contract 叶子同行为", () => {
  assert.equal(bashAllowPrefix("git status --porcelain"), "git status")
  assert.equal(bashCommandIsInterpreterStyle("bash -lc"), true)
  assert.equal(bashAllowPrefix("python script.py"), "")
  assert.equal(sessionAllowsBash("node --eval x", ["node"]), false)
})
