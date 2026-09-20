/**
 * SSH 工作区禁止回落本机 cwd / 本机磁盘。
 * root_path 形如 user@host:path，不能当本地目录。
 */
import type { WorkspaceRecord } from "../workspace-record.ts"
import { disconnectedError } from "./ssh-errors.ts"
import { getSshPoolEntry } from "./ssh-pool.ts"

/** user@host:/abs 或 host:port:/abs，禁止当本机路径。 */
export function looksLikeSshRoot(root: string): boolean {
  return /^.+@.+:/.test(root.trim()) || /^[^/\\]+:\d+:\//.test(root.trim())
}

export function assertSshPoolConnected(workspaceId: string, action = "io"): void {
  const live = getSshPoolEntry(workspaceId)
  if (live?.layer && live.status === "connected") return
  throw disconnectedError(action)
}

/** 已连接 SSH 的 jail 必须是远端 POSIX 路径，不得回落 root_path。 */
export function requireSshRemotePath(record: WorkspaceRecord): string {
  const remote = record.remotePath?.trim()
  if (!remote || looksLikeSshRoot(remote)) {
    throw new Error("SSH workspace is missing remote_path; refusing local cwd fallback.")
  }
  return remote
}

export function refuseSshLocalFilesystem(record: WorkspaceRecord, action: string): void {
  if (record.kind !== "ssh") return
  throw new Error(`SSH workspace cannot use local filesystem for ${action}.`)
}
