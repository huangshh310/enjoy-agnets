/**
 * workspaces 行映射。SSH 字段可空；私钥内容不在此结构。
 */
import type { SshAuth, SshStatus, WorkspaceKind } from "@enjoy-agents/ipc-contract"

export type WorkspaceRecord = {
  id: string
  name: string
  rootPath: string
  kind: WorkspaceKind
  sshHost?: string
  sshUser?: string
  sshPort?: number
  sshAuth?: SshAuth
  sshKeyPath?: string
  remotePath?: string
  sshStatus?: SshStatus
  sshHostId?: string
}

export const WORKSPACE_SELECT = `id, name, root_path as rootPath, kind,
  ssh_host as sshHost, ssh_user as sshUser, ssh_port as sshPort,
  ssh_auth as sshAuth, ssh_key_path as sshKeyPath, remote_path as remotePath,
  ssh_status as sshStatus, ssh_host_id as sshHostId`

export function normalizeWorkspaceRow(row: WorkspaceRecord): WorkspaceRecord {
  return {
    ...row,
    kind: row.kind === "ssh" ? "ssh" : "local",
    sshPort: row.sshPort ?? undefined,
    sshHost: row.sshHost ?? undefined,
    sshUser: row.sshUser ?? undefined,
    sshAuth: row.sshAuth === "keypath" || row.sshAuth === "agent" || row.sshAuth === "password" ? row.sshAuth : undefined,
    sshKeyPath: row.sshKeyPath ?? undefined,
    remotePath: row.remotePath ?? undefined,
    sshStatus: row.sshStatus ?? (row.kind === "ssh" ? "idle" : undefined),
    sshHostId: row.sshHostId ?? undefined
  }
}

export function publicWorkspace(row: WorkspaceRecord): WorkspaceRecord {
  return normalizeWorkspaceRow(row)
}
