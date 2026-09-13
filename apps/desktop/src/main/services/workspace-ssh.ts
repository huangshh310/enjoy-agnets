/**
 * SSH 工作区开档与连接态。私钥不入库、不进事件。
 */
import { BrowserWindow } from "electron"
import type { OpenSshWorkspaceInput, SshStatus } from "@enjoy-agents/ipc-contract"
import { WorkspaceRemoteEvent } from "@enjoy-agents/ipc-contract"
import { getDatabase, setSetting } from "./database"
import { createId } from "./ids"
import { getSshHost, upsertSshHost } from "./ssh/ssh-hosts.ts"
import { getSshPassword, setSshPassword } from "./ssh/ssh-password-vault.ts"
import {
  connectSshPool,
  disconnectSshPool,
  rememberSshSpec,
  sshLabel
} from "./ssh/ssh-pool.ts"
import type { SshConnSpec } from "./ssh/ssh.types.ts"
import { getWorkspace, type WorkspaceRecord } from "./workspace"
import { normalizeWorkspaceRow, WORKSPACE_SELECT } from "./workspace-record.ts"

/** 开 SSH 工作区：按 user@host:remotePath 去重；不 mkdir。 */
export async function openSshWorkspace(input: OpenSshWorkspaceInput): Promise<WorkspaceRecord> {
  const spec = specFromOpenInput(input)
  const sqlite = getDatabase()
  const host = upsertHostForOpen(input, spec, sqlite)
  if (input.password) setSshPassword(host.id, input.password)
  if (spec.auth === "password") spec.password = input.password?.trim() || getSshPassword(host.id)
  const rootPath = `${spec.user}@${spec.host}:${spec.remotePath}`
  const name = input.name?.trim() || `${spec.user}@${spec.host}`
  const existing = sqlite
    .prepare(`SELECT ${WORKSPACE_SELECT} FROM workspaces WHERE root_path = ?`)
    .get(rootPath) as WorkspaceRecord | undefined
  if (existing) return reuseSshWorkspace(existing, name, host.id, spec)
  return insertSshWorkspace(name, rootPath, spec, host.id)
}

function upsertHostForOpen(input: OpenSshWorkspaceInput, spec: SshConnSpec, sqlite: ReturnType<typeof getDatabase>) {
  return upsertSshHost(
    {
      id: input.hostId,
      alias: input.hostId
        ? getSshHost(input.hostId, sqlite).alias
        : input.name?.trim() || `${spec.user}@${spec.host}`,
      host: spec.host,
      user: spec.user,
      port: spec.port,
      auth: spec.auth,
      keyPath: spec.keyPath,
      source: input.hostId ? getSshHost(input.hostId, sqlite).source : input.source ?? "manual"
    },
    sqlite
  )
}

function reuseSshWorkspace(
  existing: WorkspaceRecord,
  name: string,
  hostId: string,
  spec: SshConnSpec
): WorkspaceRecord {
  const now = Date.now()
  getDatabase()
    .prepare("UPDATE workspaces SET name = ?, ssh_status = ?, ssh_host_id = ?, updated_at = ? WHERE id = ?")
    .run(name, "idle", hostId, now, existing.id)
  const record = normalizeWorkspaceRow({ ...existing, name, sshStatus: "idle", sshHostId: hostId })
  rememberSshSpec(record.id, spec, "idle")
  return record
}

function insertSshWorkspace(name: string, rootPath: string, spec: SshConnSpec, hostId: string): WorkspaceRecord {
  const now = Date.now()
  const record = normalizeWorkspaceRow({
    id: createId("ws"),
    name,
    rootPath,
    kind: "ssh",
    sshHost: spec.host,
    sshUser: spec.user,
    sshPort: spec.port,
    sshAuth: spec.auth,
    sshKeyPath: spec.keyPath,
    remotePath: spec.remotePath,
    sshStatus: "idle",
    sshHostId: hostId
  })
  getDatabase()
    .prepare(
      `INSERT INTO workspaces (id, name, root_path, created_at, updated_at, kind, ssh_host, ssh_user, ssh_port, ssh_auth, ssh_key_path, remote_path, ssh_status, ssh_host_id)
       VALUES (?, ?, ?, ?, ?, 'ssh', ?, ?, ?, ?, ?, ?, 'idle', ?)`
    )
    .run(
      record.id,
      record.name,
      record.rootPath,
      now,
      now,
      spec.host,
      spec.user,
      spec.port,
      spec.auth,
      spec.keyPath ?? null,
      spec.remotePath,
      hostId
    )
  rememberSshSpec(record.id, spec, "idle")
  setSetting("lastWorkspaceId", record.id)
  return record
}

export async function connectWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
  const record = await getWorkspace(workspaceId)
  const spec = specFromRecord(record)
  rememberSshSpec(workspaceId, spec, "connecting")
  writeStatus(workspaceId, "connecting")
  emitRemote(workspaceId, "connecting", sshLabel(spec))
  try {
    await connectSshPool(workspaceId)
    writeStatus(workspaceId, "connected")
    emitRemote(workspaceId, "connected", sshLabel(spec))
    return { ...record, sshStatus: "connected" }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeStatus(workspaceId, "failed")
    emitRemote(workspaceId, "failed", sshLabel(spec), message)
    throw error
  }
}

export async function disconnectWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
  const record = await getWorkspace(workspaceId)
  disconnectSshPool(workspaceId)
  writeStatus(workspaceId, "disconnected")
  const spec = record.kind === "ssh" ? specFromRecord(record) : null
  emitRemote(workspaceId, "disconnected", spec ? sshLabel(spec) : record.name)
  return { ...record, sshStatus: "disconnected" }
}

export async function retryWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
  disconnectSshPool(workspaceId)
  return connectWorkspace(workspaceId)
}

function specFromOpenInput(input: OpenSshWorkspaceInput): SshConnSpec {
  if (input.hostId) {
    const host = getSshHost(input.hostId, getDatabase())
    return {
      host: input.host.trim() || host.host,
      user: input.user.trim() || host.user,
      port: input.port || host.port,
      auth: input.auth,
      keyPath: input.keyPath?.trim() || host.keyPath,
      password: input.password,
      remotePath: input.remotePath.trim(),
      transport: host.source === "wsl" || input.source === "wsl" ? "wsl" : "ssh"
    }
  }
  return {
    host: input.host.trim(),
    user: input.user.trim(),
    port: input.port,
    auth: input.auth,
    keyPath: input.keyPath?.trim(),
    password: input.password,
    remotePath: input.remotePath.trim(),
    transport: input.source === "wsl" ? "wsl" : "ssh"
  }
}

export function sshSpecFromRecord(record: WorkspaceRecord): SshConnSpec {
  return specFromRecord(record)
}

function specFromRecord(record: WorkspaceRecord): SshConnSpec {
  if (record.kind !== "ssh" || !record.sshHost || !record.sshUser || !record.remotePath) {
    throw new Error("Workspace is not an SSH location.")
  }
  const spec: SshConnSpec = {
    host: record.sshHost,
    user: record.sshUser,
    port: record.sshPort ?? 22,
    auth: record.sshAuth ?? "agent",
    keyPath: record.sshKeyPath,
    remotePath: record.remotePath,
    transport: transportForWorkspace(record.sshHostId)
  }
  if (spec.auth === "password") spec.password = getSshPassword(record.sshHostId)
  return spec
}

function transportForWorkspace(hostId?: string): "ssh" | "wsl" {
  if (!hostId) return "ssh"
  try {
    return getSshHost(hostId, getDatabase()).source === "wsl" ? "wsl" : "ssh"
  } catch {
    return "ssh"
  }
}

function writeStatus(workspaceId: string, status: SshStatus) {
  getDatabase()
    .prepare("UPDATE workspaces SET ssh_status = ?, updated_at = ? WHERE id = ?")
    .run(status, Date.now(), workspaceId)
}

function emitRemote(workspaceId: string, status: SshStatus, label: string, error?: string) {
  const payload = WorkspaceRemoteEvent.parse({ workspaceId, status, label, error })
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send("workspace.remote", payload)
  }
}
