import assert from "node:assert/strict"
import { test } from "node:test"
import {
  looksLikeSshRoot,
  refuseSshLocalFilesystem,
  requireSshRemotePath
} from "./refuse-local-cwd.ts"
import type { WorkspaceRecord } from "../workspace-record.ts"

test("looksLikeSshRoot 认出 user@host:path，不误伤本机路径", () => {
  assert.equal(looksLikeSshRoot("alice@dev:/home/alice/app"), true)
  assert.equal(looksLikeSshRoot("152.32.1.1:2222:/var/www"), true)
  assert.equal(looksLikeSshRoot("/home/alice/app"), false)
  assert.equal(looksLikeSshRoot("C:\\Users\\alice\\app"), false)
})

test("requireSshRemotePath 不得回落 root_path", () => {
  const record: WorkspaceRecord = {
    id: "ws_ssh",
    name: "remote",
    rootPath: "alice@dev:/home/alice/app",
    kind: "ssh"
  }
  assert.throws(() => requireSshRemotePath(record), /remote_path/)
  assert.equal(
    requireSshRemotePath({ ...record, remotePath: "/home/alice/app" }),
    "/home/alice/app"
  )
})

test("refuseSshLocalFilesystem 在 ssh 上拒绝本机盘", () => {
  const record: WorkspaceRecord = {
    id: "ws_ssh",
    name: "remote",
    rootPath: "alice@dev:/home/alice/app",
    kind: "ssh",
    remotePath: "/home/alice/app"
  }
  assert.throws(() => refuseSshLocalFilesystem(record, "knowledge"), /local filesystem/)
  refuseSshLocalFilesystem({ ...record, kind: "local" }, "knowledge")
})
