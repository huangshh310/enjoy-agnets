/**
 * SSH host：注入连接层，不断开时写失败必须可识别。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { createDisconnectedHost } from "./ssh-disconnected-host.ts"
import { createSshWorkspaceHost } from "./ssh-workspace-host.ts"
import { isRemoteDisconnected, REMOTE_DISCONNECTED } from "./ssh-errors.ts"
import type { SshConnectionLayer } from "./ssh.types.ts"

function fakeConn(status: SshConnectionLayer["status"] = "connected"): SshConnectionLayer & {
  files: Map<string, string>
} {
  const files = new Map<string, string>([["/home/alice/app/readme.md", "hi"]])
  const conn: SshConnectionLayer & { files: Map<string, string> } = {
    files,
    status,
    ping: async () => "ok",
    exec: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    readFile: async (abs) => {
      const value = files.get(abs)
      if (value == null) throw new Error(`无此路径: ${abs}`)
      return value
    },
    writeFile: async (abs, content) => {
      files.set(abs, content)
    },
    listDir: async () => [{ name: "readme.md", kind: "file" }],
    dispose: () => {
      conn.status = "disconnected"
    }
  }
  return conn
}

test("已连接时可读写 jail 内路径", async () => {
  const conn = fakeConn()
  const host = createSshWorkspaceHost(conn, "/home/alice/app")
  assert.equal(await host.readFile("readme.md"), "hi")
  await host.writeFile("readme.md", "yo")
  assert.equal(await host.readFile("readme.md"), "yo")
})

test("路径逃出 remote_path 被拒", async () => {
  const host = createSshWorkspaceHost(fakeConn(), "/home/alice/app")
  await assert.rejects(() => host.readFile("../secret"), /escapes/)
  await assert.rejects(() => host.writeFile("../../etc/passwd", "x"), /escapes/)
})

test("未连接/断开时写抛可识别断开错误而非 ok", async () => {
  const conn = fakeConn("disconnected")
  const host = createSshWorkspaceHost(conn, "/home/alice/app")
  await assert.rejects(() => host.writeFile("readme.md", "x"), (error: unknown) => {
    assert.equal(isRemoteDisconnected(error), true)
    return true
  })
  const dead = createDisconnectedHost("disconnected")
  await assert.rejects(() => dead.bash("echo hi"), (error: unknown) => {
    assert.equal(isRemoteDisconnected(error), true)
    assert.ok(error instanceof Error && error.message.includes("REMOTE_DISCONNECTED"))
    return true
  })
  assert.notEqual(REMOTE_DISCONNECTED, "{ok:true}")
})
