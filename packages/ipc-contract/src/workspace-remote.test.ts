import assert from "node:assert/strict"
import { test } from "node:test"
import {
  HOST_IN_USE,
  OpenSshWorkspaceInput,
  REMOTE_DISCONNECTED,
  SshHost,
  SshHostUpsertInput,
  SshBrowseInput,
  SshProbeInput,
  WorkspaceRemoteEvent
} from "./workspace-remote.ts"
import { WorkspaceSummary } from "./workspace-io.ts"

test("OpenSshWorkspaceInput 需要 host/user/remotePath，keypath 必须带路径", () => {
  const parsed = OpenSshWorkspaceInput.parse({
    host: "dev.internal",
    user: "alice",
    auth: "agent",
    remotePath: "/home/alice/app"
  })
  assert.equal(parsed.port, 22)
  assert.throws(() =>
    OpenSshWorkspaceInput.parse({
      host: "dev.internal",
      user: "alice",
      auth: "keypath",
      remotePath: "/home/alice/app"
    })
  )
})

test("WorkspaceSummary 默认为 local，无私钥内容字段", () => {
  const parsed = WorkspaceSummary.parse({ id: "ws_1", name: "app", rootPath: "/tmp/app" })
  assert.equal(parsed.kind, "local")
  const src = JSON.stringify(OpenSshWorkspaceInput.shape)
  assert.equal(src.includes("privateKey"), false)
  assert.equal(REMOTE_DISCONNECTED, "REMOTE_DISCONNECTED")
})

test("WorkspaceRemoteEvent 不含密钥", () => {
  const event = WorkspaceRemoteEvent.parse({
    workspaceId: "ws_1",
    status: "connected",
    label: "alice@dev:/home/alice/app"
  })
  assert.equal(event.status, "connected")
})

test("密码只出现在写通道，SshHost 列表不含 password", () => {
  const opened = OpenSshWorkspaceInput.parse({
    host: "152.32.225.119",
    user: "ubuntu",
    auth: "password",
    password: "secret",
    remotePath: "/home/ubuntu/app"
  })
  assert.equal(opened.auth, "password")
  assert.throws(() =>
    OpenSshWorkspaceInput.parse({
      host: "152.32.225.119",
      user: "ubuntu",
      auth: "password",
      remotePath: "/home/ubuntu/app"
    })
  )
  const saved = SshHostUpsertInput.parse({
    id: "sshhost_1",
    alias: "ucloud",
    host: "152.32.225.119",
    user: "ubuntu",
    auth: "password"
  })
  assert.equal(saved.id, "sshhost_1")
  const listed = SshHost.parse({
    id: "sshhost_1",
    alias: "ucloud",
    host: "152.32.225.119",
    user: "ubuntu",
    port: 22,
    auth: "password",
    source: "manual",
    workspaceCount: 0,
    workspaces: []
  })
  assert.equal(listed.auth, "password")
  assert.throws(() =>
    SshHost.parse({
      ...listed,
      password: "secret"
    })
  )
  const probe = SshProbeInput.parse({
    host: "152.32.225.119",
    user: "ubuntu",
    auth: "password",
    password: "secret"
  })
  assert.equal(probe.password, "secret")
})

test("OpenSshWorkspaceInput 可带 hostId；SshHostUpsert / Probe 无私钥内容", () => {
  const opened = OpenSshWorkspaceInput.parse({
    hostId: "sshhost_1",
    host: "dev.internal",
    user: "alice",
    auth: "agent",
    remotePath: "/home/alice/app"
  })
  assert.equal(opened.hostId, "sshhost_1")
  const host = SshHostUpsertInput.parse({
    alias: "devbox",
    host: "dev.internal",
    user: "alice",
    auth: "agent"
  })
  assert.equal(host.port, 22)
  const probe = SshProbeInput.parse({ hostId: "sshhost_1" })
  assert.equal(probe.hostId, "sshhost_1")
  assert.throws(() => SshProbeInput.parse({}))
  assert.equal(HOST_IN_USE, "HOST_IN_USE")
  const browse = SshBrowseInput.parse({ hostId: "sshhost_1", path: "/home/alice" })
  assert.equal(browse.path, "/home/alice")
  const src = JSON.stringify(SshHostUpsertInput.shape)
  assert.equal(src.includes("privateKey"), false)
})
