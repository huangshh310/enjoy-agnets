/**
 * 删除 SSH 项目时 main 走 dropSshPool：dispose 连接并从 map 拿掉，重复调用幂等。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import {
  connectSshPool,
  dropSshPool,
  getSshPoolEntry,
  rememberSshSpec,
  resetSshConnectionFactory,
  setSshConnectionFactory
} from "./ssh-pool.ts"
import type { SshConnSpec, SshConnectionLayer } from "./ssh.types.ts"

const spec: SshConnSpec = {
  host: "example.com",
  user: "alice",
  port: 22,
  auth: "agent",
  remotePath: "/home/alice/app"
}

function fakeLayer(onDispose: () => void): SshConnectionLayer {
  return {
    status: "connected",
    ping: async () => "ok",
    exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    readFile: async () => "",
    writeFile: async () => undefined,
    listDir: async () => [],
    dispose: onDispose
  }
}

afterEach(() => {
  resetSshConnectionFactory()
})

test("dropSshPool 会 dispose 连接且幂等", async () => {
  let disposed = 0
  setSshConnectionFactory(async () => fakeLayer(() => {
    disposed += 1
  }))
  rememberSshSpec("ws-ssh", spec)
  await connectSshPool("ws-ssh")
  assert.equal(getSshPoolEntry("ws-ssh")?.status, "connected")
  dropSshPool("ws-ssh")
  assert.equal(disposed, 1)
  assert.equal(getSshPoolEntry("ws-ssh"), undefined)
  dropSshPool("ws-ssh")
  assert.equal(disposed, 1)
})
