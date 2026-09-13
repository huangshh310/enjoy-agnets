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
