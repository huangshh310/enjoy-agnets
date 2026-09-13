/**
 * SSH 连接层接口。host 适配器只依赖这一层，测试替身只替换连接层。
 */
import type { SshAuth, SshStatus } from "@enjoy-agents/ipc-contract"

export type { SshAuth, SshStatus }

export type SshTransport = "ssh" | "wsl"

export type SshConnSpec = {
  host: string
  user: string
  port: number
  auth: SshAuth
  keyPath?: string
  /** 仅 main 内存；不进 SQLite、不进事件。 */
  password?: string
  remotePath: string
  /** wsl：host 是发行版名，走 wsl.exe，不必 sshd。 */
  transport?: SshTransport
}

export type SshExecResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export type SshDirEntry = { name: string; kind: "file" | "directory" }

export type SshConnectionLayer = {
  status: SshStatus
  ping(): Promise<"ok">
  exec(command: string): Promise<SshExecResult>
  readFile(absPath: string): Promise<string>
  writeFile(absPath: string, content: string): Promise<void>
  listDir(absPath: string): Promise<SshDirEntry[]>
  dispose(): void
}

export type SshConnectionFactory = (spec: SshConnSpec) => Promise<SshConnectionLayer>
