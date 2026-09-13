import assert from "node:assert/strict"
import { test } from "node:test"
import { probeSsh, resetSshProbeFactory, setSshProbeFactory } from "./ssh-probe.ts"
import type { SshConnectionLayer } from "./ssh.types.ts"

test("probeSsh 走注入工厂，不真连网", async () => {
  let calls = 0
  setSshProbeFactory(async () => {
    calls += 1
    const layer: SshConnectionLayer = {
      status: "connected",
      ping: async () => "ok",
      exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
      readFile: async () => "",
      writeFile: async () => undefined,
      listDir: async () => [],
      dispose: () => undefined
    }
    return layer
  })
  try {
    const ok = await probeSsh({ host: "dev", user: "alice", port: 22, auth: "agent" })
    assert.equal(ok.ok, true)
    assert.equal(calls, 1)
    setSshProbeFactory(async () => {
      throw new Error("Permission denied")
    })
    const failed = await probeSsh({ host: "dev", user: "alice", port: 22, auth: "agent" })
    assert.equal(failed.ok, false)
    assert.match(failed.error ?? "", /Permission denied/)
  } finally {
    resetSshProbeFactory()
  }
})
