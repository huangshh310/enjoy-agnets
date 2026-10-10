/**
 * 发现并导入 Agent 侧 ACP 会话到 Enjoy 侧栏。
 */
import { listAcpRemoteSessions } from "@enjoy-agents/agent-harness"
import type { ImportAcpSessionInput, ListAcpSessionsResult } from "@enjoy-agents/ipc-contract"
import { readAgentToolOverrides } from "./agent-tools-vault"
import { listBoundAcpSessionIds, writeAcpSessionBind } from "./acp-session-bind.ts"
import { projectListedAcpSessions } from "./acp-session-import-project.ts"
import { acpListSpawnOverride } from "./acp-session-import-override.ts"
import { createSession } from "./session-queries"
import { getWorkspace } from "./workspace"
import { writeSessionRuntime } from "./agent-tools-vault"

export async function listImportableAcpSessions(
  runtimeId: string,
  workspaceId: string
): Promise<ListAcpSessionsResult> {
  const workspace = await getWorkspace(workspaceId)
  const override = readAgentToolOverrides()[runtimeId]
  let remote: Awaited<ReturnType<typeof listAcpRemoteSessions>>
  try {
    remote = await listAcpRemoteSessions({
      id: runtimeId,
      cwd: workspace.rootPath,
      override: acpListSpawnOverride(override)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { supported: true, sessions: [], error: message }
  }
  const imported = listBoundAcpSessionIds(workspaceId, runtimeId)
  return projectListedAcpSessions({
    supported: remote.supported,
    sessions: remote.sessions,
    imported,
    cwd: workspace.rootPath
  })
}

export async function importAcpSession(input: ImportAcpSessionInput) {
  const title = input.title?.trim() || "从本机助手导入"
  const created = await createSession(input.workspaceId, title.slice(0, 80))
  writeAcpSessionBind(created.id, input.runtimeId, input.acpSessionId)
  writeSessionRuntime(created.id, input.runtimeId)
  return created
}
