/**
 * SSH git/diff/move 走 host，不把 user@host:path 当本机目录。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import {
  changesFromGitStatus,
  sshWorkspaceChanges,
  sshWorkspaceGitLog,
  sshWorkspaceMove,
  sshWorkspacePatch,
  sshWorkspaceRestore,
  sshWorkspaceStage
} from "./workspace-ssh-io.ts"

function fakeHost(git: {
  status?: string
  diff?: string
  log?: string
  bash?: string[]
}): AgentWorkspaceHost & { bashLog: string[] } {
  const bashLog: string[] = git.bash ?? []
  return {
    bashLog,
    readFile: async () => "",
    writeFile: async () => undefined,
    editFile: async () => "",
    listDir: async () => [],
    glob: async () => [],
    grep: async () => [],
    bash: async (command) => {
      bashLog.push(command)
      if (command.includes("log")) {
        return { stdout: git.log ?? "", stderr: "", exitCode: 0 }
      }
      if (command.includes("diff")) {
        return { stdout: git.diff ?? "", stderr: "", exitCode: 0 }
      }
      return { stdout: "", stderr: "", exitCode: 0 }
    },
    gitStatus: async () => git.status ?? "",
    gitDiff: async () => git.diff ?? "",
    gitLog: async () => git.log ?? "",
    gitCommit: async () => "ok",
    gitPush: async () => "ok"
  }
}

test("changes 解析 host.gitStatus，不是空 stub", async () => {
  const rows = await sshWorkspaceChanges(fakeHost({ status: " M src/a.ts" }))
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.path, "src/a.ts")
  assert.equal(changesFromGitStatus("").length, 0)
})

test("gitLog 走 host bash git log", async () => {
  const log =
    "abc123\x1fabc\x1ffeat\x1fAnn\x1fa@b\x1f2 days ago\x1f2026-09-01\n 1 file changed, 2 insertions(+)"
  const result = await sshWorkspaceGitLog(fakeHost({ log }))
  assert.ok(result.commits.length >= 1)
  assert.equal(result.commits[0]?.message, "feat")
})

test("patch/stage/restore/move 经 host，路径 jail", async () => {
  const host = fakeHost({})
  const patch = await sshWorkspacePatch(host, ["src/a.ts"])
  assert.equal(typeof patch, "string")
  assert.ok(host.bashLog.some((cmd) => cmd.includes("git") && cmd.includes("diff")))
  await sshWorkspaceStage(host, "/home/alice/app", ["src/a.ts"], "add")
  assert.ok(host.bashLog.some((cmd) => cmd.includes("add")))
  await sshWorkspaceRestore(host, "/home/alice/app", ["src/a.ts"])
  assert.ok(host.bashLog.some((cmd) => cmd.includes("restore")))
  const moved = await sshWorkspaceMove(host, "/home/alice/app", "src/a.ts", "lib")
  assert.equal(moved.to, "lib/a.ts")
  assert.ok(host.bashLog.some((cmd) => cmd.includes("mv")))
  await assert.rejects(() => sshWorkspaceMove(host, "/home/alice/app", "../secret", "lib"))
})
