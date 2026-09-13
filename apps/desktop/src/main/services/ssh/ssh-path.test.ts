import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveRemoteJail } from "./ssh-path.ts"

test("SSH 路径逃出 remote_path 被拒", () => {
  assert.equal(resolveRemoteJail("/home/alice/app", "src/a.ts"), "/home/alice/app/src/a.ts")
  assert.throws(() => resolveRemoteJail("/home/alice/app", "../etc/passwd"))
  assert.throws(() => resolveRemoteJail("/home/alice/app", "/etc/passwd"))
})
