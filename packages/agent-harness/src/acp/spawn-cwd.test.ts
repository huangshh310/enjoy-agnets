import assert from "node:assert/strict"
import { test } from "node:test"
import { acpHandshakeCwd, acpSpawnCwd, mapAcpSpawnFailure } from "./spawn.ts"

test("SSH spawn cwd 不用 user@host:path，handshake 用远端路径", () => {
  const display = "alice@dev.internal:/home/alice/app"
  const spawnDirect = { cwd: "/Users/alice", handshakeCwd: "/home/alice/app" }
  assert.equal(acpSpawnCwd(display, spawnDirect), "/Users/alice")
  assert.equal(acpHandshakeCwd(display, spawnDirect), "/home/alice/app")
  assert.notEqual(acpSpawnCwd(display, spawnDirect), display)
})

test("缺远端 CLI 的失败人话走 failHint", () => {
  const hint = "远端未找到 claude"
  const mapped = mapAcpSpawnFailure(new Error("ENOENT: no such file"), hint)
  assert.equal(mapped.message, hint)
  const passthrough = mapAcpSpawnFailure(new Error(hint), hint)
  assert.equal(passthrough.message, hint)
})
