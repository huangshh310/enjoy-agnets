/**
 * 按工作区 kind 选 host。local 工厂由调用方注入，避免 SSH 测试拖进本机 host。
 */
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import type { AskUserAnswers } from "@enjoy-agents/ipc-contract"
import { requireSshRemotePath } from "./ssh/refuse-local-cwd.ts"
import { createDisconnectedHost } from "./ssh/ssh-disconnected-host.ts"
import { createSshWorkspaceHost } from "./ssh/ssh-workspace-host.ts"
import { getSshPoolEntry } from "./ssh/ssh-pool.ts"
import type { WorkspaceRecord } from "./workspace-record.ts"

export type HostExtras = {
  takeQuestionAnswers?: () => AskUserAnswers | undefined
  onTouchedPath?: (relativePath: string, kind: "file" | "directory") => void
}

export type LocalHostFactory = (root: string, extras?: HostExtras) => AgentWorkspaceHost

export function resolveWorkspaceHost(
  record: WorkspaceRecord,
  extras?: HostExtras,
  localHost?: LocalHostFactory
): AgentWorkspaceHost {
  if (record.kind !== "ssh") {
    if (!localHost) throw new Error("Local workspace host factory is required.")
    return localHost(record.rootPath, extras)
  }
  const live = getSshPoolEntry(record.id)
  if (!live?.layer || live.status !== "connected") {
    const reported = live?.status ?? record.sshStatus ?? "disconnected"
    // 重启后 DB 可能仍写 connected，但 pool 已空：按断开处理，禁止当成本机盘。
    return createDisconnectedHost(reported === "connected" ? "disconnected" : reported)
  }
  const remote = requireSshRemotePath(record)
  return createSshWorkspaceHost(live.layer, remote)
}
