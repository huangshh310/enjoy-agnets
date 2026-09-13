/**
 * 创建项目远程连接入参。与 OpenSshWorkspaceInput 对齐。
 */
export type RemoteConnectInput = {
  hostId?: string
  host: string
  user: string
  port: number
  auth: "agent" | "keypath" | "password"
  keyPath?: string
  password?: string
  remotePath: string
  name?: string
  source?: "manual" | "ssh_config" | "wsl"
}
