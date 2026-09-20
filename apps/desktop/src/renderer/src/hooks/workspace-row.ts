/**
 * 侧栏 / 会话切换用的工作区行。含 SSH 位置字段。
 */
export type WorkspaceRow = {
  id: string
  name: string
  rootPath: string
  kind?: "local" | "ssh"
  sshStatus?: "idle" | "connecting" | "connected" | "failed" | "disconnected"
  sshHost?: string
  sshUser?: string
  sshPort?: number
  sshKeyPath?: string
  remotePath?: string
}

/** 侧栏节点切工作区时必须带 kind，否则 SSH 会被当成本地且不 connect。 */
export function workspaceRowFromNode(workspace: {
  id: string
  name: string
  rootPath?: string
  locationKind?: "local" | "ssh"
  sshStatus?: WorkspaceRow["sshStatus"]
  sshHost?: string
  sshUser?: string
  remotePath?: string
}): WorkspaceRow {
  return {
    id: workspace.id,
    name: workspace.name,
    rootPath: workspace.rootPath || "",
    kind: workspace.locationKind,
    sshStatus: workspace.sshStatus,
    sshHost: workspace.sshHost,
    sshUser: workspace.sshUser,
    remotePath: workspace.remotePath
  }
}
