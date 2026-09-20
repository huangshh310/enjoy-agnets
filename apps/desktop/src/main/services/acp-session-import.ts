/**
 * 发现并导入 Agent 侧 ACP 会话到 Enjoy 侧栏。
 */
import { listAcpRemoteSessions } from "@enjoy-agents/agent-harness"
import type { ImportAcpSessionInput, ListAcpSessionsResult } from "@enjoy-agents/ipc-contract"
import { readAgentToolOverrides } from "./agent-tools-vault"
import { listBoundAcpSessionIds, writeAcpSessionBind } from "./acp-session-bind.ts"
import { createSession } from "./session-queries"
import { getWorkspace } from "./workspace"
import { writeSessionRuntime } from "./agent-tools-vault"

export async function listImportableAcpSessions(
  runtimeId: string,
  workspaceId: string
): Promise<ListAcpSessionsResult> {
  const workspace = await getWorkspace(workspaceId)
  const override = readAgentToolOverrides()[runtimeId]
  const remote = await listAcpRemoteSessions({
    id: runtimeId,
    cwd: workspace.rootPath,
    override: override?.binaryPath
      ? { binaryPath: override.binaryPath, extraArgs: override.extraArgs, modelId: override.modelId }
      : { extraArgs: override?.extraArgs, modelId: override.modelId }
  })
  if (!remote.supported) return { supported: false, sessions: [] }
  const imported = listBoundAcpSessionIds(workspaceId, runtimeId)
  const cwd = workspace.rootPath.replace(/\\/g, "/")
  const sessions = remote.sessions
    .filter((row) => row.cwd.replace(/\\/g, "/") === cwd)
    .map((row) => ({
      sessionId: row.sessionId,
      title: row.title,
      updatedAt: row.updatedAt,
      imported: imported.has(row.sessionId)
    }))
  return { supported: true, sessions }
}

export async function importAcpSession(input: ImportAcpSessionInput) {
  const title = input.title?.trim() || "从本机助手导入"
  const created = await createSession(input.workspaceId, title.slice(0, 80))
  writeAcpSessionBind(created.id, input.runtimeId, input.acpSessionId)
  writeSessionRuntime(created.id, input.runtimeId)
  return created
}
