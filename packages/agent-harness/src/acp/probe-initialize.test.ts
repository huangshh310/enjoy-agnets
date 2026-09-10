/**
 * initialize 探测：成功 / 超时 / auth_required。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { AcpAuthRequiredError } from "./auth.ts"
import { probeAcpInitialize } from "./probe-initialize.ts"

test("initialize 成功则 ok", async () => {
  const probe = await probeAcpInitialize({
    id: "opencode",
    cwd: "/",
    run: async () => ({ protocolVersion: 1 })
  })
  assert.equal(probe.ok, true)
  assert.equal(probe.authRequired, false)
})

test("auth_required 仍算协议通", async () => {
  const probe = await probeAcpInitialize({
    id: "claude",
    cwd: "/",
    run: async () => {
      throw new AcpAuthRequiredError("needs login")
    }
  })
  assert.equal(probe.ok, true)
  assert.equal(probe.authRequired, true)
})

test("超时则失败", async () => {
  const probe = await probeAcpInitialize({
    id: "pi",
    cwd: "/",
    timeoutMs: 20,
    run: () => new Promise(() => undefined)
  })
  assert.equal(probe.ok, false)
  assert.match(probe.message, /timed out/)
})
