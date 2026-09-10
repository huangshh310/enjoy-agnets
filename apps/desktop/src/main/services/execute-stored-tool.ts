/**
 * 重启后的审批没有活着的 ToolLoop wait：按库里的 args 执行写盘 / bash。
 */
import { createWorkspaceHost } from "./workspace-host"
import { getApproval } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import type { ActiveRun } from "./agent-run-state"
import type { PendingApproval } from "./consume-stream"

export async function executeStoredTool(run: ActiveRun, pending: PendingApproval): Promise<void> {
  const row = getApproval(getDatabase(), pending.approvalId)
  if (!row) return
  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(row.args) as Record<string, unknown>
  } catch {
    return
  }
  const host = createWorkspaceHost(run.workspaceRoot)
  const path = typeof args.path === "string" ? args.path : ""
  if (pending.name === "write_file" && path && typeof args.content === "string") {
    await host.writeFile(path, args.content)
    return
  }
  if (
    pending.name === "edit_file" &&
    path &&
    typeof args.oldText === "string" &&
    typeof args.newText === "string"
  ) {
    await host.editFile(path, args.oldText, args.newText)
    return
  }
  if (pending.name === "bash" && typeof args.command === "string") {
    await host.bash(args.command)
    return
  }
  if (pending.name === "git_commit" && typeof args.message === "string") {
    await host.gitCommit(args.message)
    return
  }
  if (pending.name === "git_push") {
    await host.gitPush()
  }
}
