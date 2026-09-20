import assert from "node:assert/strict"
import { test } from "node:test"
import { workspaceRowFromNode } from "./workspace-row.ts"

test("侧栏切工作区必须带 locationKind，SSH 不得丢成 local", () => {
  const row = workspaceRowFromNode({
    id: "ws1",
    name: "dev",
    rootPath: "alice@dev:/home/alice/app",
    locationKind: "ssh",
    sshStatus: "connected",
    sshHost: "dev",
    sshUser: "alice",
    remotePath: "/home/alice/app"
  })
  assert.equal(row.kind, "ssh")
  assert.equal(row.remotePath, "/home/alice/app")
  assert.equal(row.sshHost, "dev")
})
