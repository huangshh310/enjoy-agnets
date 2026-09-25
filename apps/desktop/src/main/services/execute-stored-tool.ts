/**
 * 重启后的审批没有活着的 ToolLoop wait：按库里的 args 直接执行工具。
 * 分发表必须与 createCodingTools / createMcpAgentTools 的可审批工具集合一致，
 * 漏一个就会出现「点了允许但什么都没发生」的假放行。
 */
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import { mcpAgentToolName } from "@enjoy-agents/mcp"
import { SET_SESSION_HEARTBEAT_TOOL } from "@enjoy-agents/agent-core"
import { ASK_USER_QUESTIONS_TOOL } from "@enjoy-agents/ipc-contract"
import { looksLikeSshRoot } from "./ssh/refuse-local-cwd.ts"
import { disconnectedError } from "./ssh/ssh-errors.ts"
import { createWorkspaceHost, getWorkspace } from "./workspace"
import { resolveWorkspaceHost } from "./workspace-host-factory"
import { getApproval } from "@enjoy-agents/db"
import { getDatabase } from "./database"
import { callServerTool, listVisibleMcpTools } from "./mcp-service"
import type { ActiveRun } from "./agent-run-state"
import type { PendingApproval } from "./consume-stream"

export async function executeStoredTool(run: ActiveRun, pending: PendingApproval): Promise<void> {
  const args = storedToolArgs(pending.approvalId)
  if (!args) return
  const host = await hostForRun(run)
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
  if (pending.name === "code_mode" && path) {
    await resumeCodeMode(host, args)
    return
  }
  if (pending.name === "git_commit" && typeof args.message === "string") {
    await host.gitCommit(args.message, { stageAll: args.stageAll === true })
    return
  }
  if (pending.name === "git_branch" && typeof args.name === "string") {
    if (!host.gitBranch) throw new Error("git_branch is not available.")
    await host.gitBranch(args.name, args.checkout === true)
    return
  }
  if (pending.name === "git_push") {
    await host.gitPush()
    return
  }
  if (pending.name === ASK_USER_QUESTIONS_TOOL) return
  if (pending.name === SET_SESSION_HEARTBEAT_TOOL) {
    await resumeSessionHeartbeat(run.input.sessionId, args)
    return
  }
  if (pending.name === "desktop_act") {
    const { resumeDesktopAct } = await import("./builtin-tools/computer-use/desktop-tools")
    await resumeDesktopAct(args)
    return
  }
  const mcp = findVisibleMcpTool(pending.name)
  if (mcp) {
    await callServerTool(mcp.serverId, mcp.name, args, { fromApprovedAgent: true })
    return
  }
  throw new Error(`Approved tool "${pending.name}" cannot be resumed after restart.`)
}

/** 库里的 args 解析失败或行已不在，就当这次恢复没有发生。 */
function storedToolArgs(approvalId: string): Record<string, unknown> | null {
  const row = getApproval(getDatabase(), approvalId)
  if (!row) return null
  try {
    return JSON.parse(row.args) as Record<string, unknown>
  } catch {
    return null
  }
}

async function resumeSessionHeartbeat(sessionId: string, args: Record<string, unknown>): Promise<void> {
  const cadence = typeof args.cadence === "string" ? args.cadence : ""
  const prompt = typeof args.prompt === "string" ? args.prompt : ""
  if (!cadence || !prompt) {
    throw new Error("set_session_heartbeat approval is missing cadence or prompt.")
  }
  const { saveHostHeartbeat } = await import("./workspace-host")
  const saved = await saveHostHeartbeat({
    sessionId,
    cadence,
    prompt,
    maxRuns: typeof args.maxRuns === "number" ? args.maxRuns : null
  })
  if (!saved.ok) throw new Error(saved.error)
}

async function hostForRun(run: ActiveRun): Promise<AgentWorkspaceHost> {
  if (run.input.workspaceId) {
    const record = await getWorkspace(run.input.workspaceId)
    return resolveWorkspaceHost(record, undefined, createWorkspaceHost)
  }
  if (looksLikeSshRoot(run.workspaceRoot)) {
    throw disconnectedError("tool")
  }
  return createWorkspaceHost(run.workspaceRoot)
}

/** code_mode = 写脚本 + 执行，与工具 execute 保持同一顺序。 */
async function resumeCodeMode(
  host: AgentWorkspaceHost,
  args: Record<string, unknown>
): Promise<void> {
  const source = typeof args.source === "string" ? args.source : ""
  const command = typeof args.command === "string" ? args.command : ""
  if (!source || !command) {
    throw new Error("code_mode approval is missing source or command.")
  }
  await host.writeFile(args.path as string, source)
  await host.bash(command)
}

/** MCP 工具名经字符清洗不可逆，只能对当前可见工具表反查。 */
function findVisibleMcpTool(agentToolName: string) {
  for (const item of listVisibleMcpTools()) {
    if (mcpAgentToolName(item.serverId, item.name) === agentToolName) {
      return { serverId: item.serverId, name: item.name }
    }
  }
  return undefined
}
