import assert from "node:assert/strict"
import { test } from "node:test"
import {
  commandNamesMatch,
  parseAcpChildLedger,
  removeAcpChild,
  shouldReapAcpChild,
  upsertAcpChild
} from "./acp-child-ledger.ts"

const row = { pid: 4242, toolId: "claude", command: "/usr/local/bin/claude", startedAt: 1 }

test("坏 JSON / 非数组得到空账本", () => {
  assert.deepEqual(parseAcpChildLedger(""), [])
  assert.deepEqual(parseAcpChildLedger("nope"), [])
  assert.deepEqual(parseAcpChildLedger("{}"), [])
})

test("upsert 按 pid 覆盖，remove 按 pid 删", () => {
  const next = upsertAcpChild([row], { ...row, command: "/opt/claude" })
  assert.equal(next.length, 1)
  assert.equal(next[0]?.command, "/opt/claude")
  assert.deepEqual(removeAcpChild(next, 4242), [])
})

test("comm 对得上才收尸，pid 复用成别的进程则放过", () => {
  assert.equal(shouldReapAcpChild(row, { exists: true, comm: "claude" }), true)
  assert.equal(shouldReapAcpChild(row, { exists: true, comm: "Claude.exe" }), true)
  assert.equal(shouldReapAcpChild(row, { exists: true, comm: "node" }), false)
  assert.equal(shouldReapAcpChild(row, { exists: false, comm: "claude" }), false)
  assert.equal(shouldReapAcpChild({ ...row, pid: process.pid }, { exists: true, comm: "claude" }), false)
})

test("commandNamesMatch 只比 basename", () => {
  assert.equal(commandNamesMatch("/bin/claude", "C:\\\\cli\\\\claude.exe"), true)
  assert.equal(commandNamesMatch("cursor", "claude"), false)
})
