import assert from "node:assert/strict"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import { resolveWorkspaceHost } from "./workspace-host-factory.ts"
import { isRemoteDisconnected } from "./ssh/ssh-errors.ts"
import type { WorkspaceRecord } from "./workspace-record.ts"

function fsLocalHost(root: string): AgentWorkspaceHost {
  return {
    readFile: async (relativePath) => (await import("node:fs/promises")).readFile(join(root, relativePath), "utf8"),
    writeFile: async () => undefined,
    editFile: async () => "",
    listDir: async () => [],
    glob: async () => [],
    grep: async () => [],
    bash: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    gitStatus: async () => "",
    gitDiff: async () => "",
    gitLog: async () => "",
    gitCommit: async () => "",
    gitPush: async () => ""
  }
}

test("kind=local 仍走本机 host", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-local-host-"))
  await writeFile(join(root, "a.txt"), "hello", "utf8")
  const host = resolveWorkspaceHost(
    { id: "ws_local", name: "local", rootPath: root, kind: "local" },
    undefined,
    fsLocalHost
  )
  assert.equal(await host.readFile("a.txt"), "hello")
})

test("SSH 未连接时写/bash 抛断开错误", async () => {
  const record: WorkspaceRecord = {
    id: "ws_ssh",
    name: "remote",
    rootPath: "alice@dev:/home/alice/app",
    kind: "ssh",
    remotePath: "/home/alice/app",
    sshStatus: "disconnected"
  }
  const host = resolveWorkspaceHost(record)
  await assert.rejects(() => host.writeFile("a.txt", "x"), (error: unknown) => isRemoteDisconnected(error))
  await assert.rejects(() => host.bash("echo hi"), (error: unknown) => isRemoteDisconnected(error))
})
