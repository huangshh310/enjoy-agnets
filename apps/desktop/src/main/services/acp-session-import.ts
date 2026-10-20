/**
 * 发现并导入 Agent 侧 ACP 会话到 Enjoy 侧栏。
 */
import { listAcpRemoteSessions } from "@enjoy-agents/agent-harness"
import { isCustomAgentId, type ImportAcpSessionInput, type ListAcpSessionsResult } from "@enjoy-agents/ipc-contract"
import { readAgentToolOverrides, writeSessionRuntime } from "./agent-tools-vault"
import { createImportedAcpSession } from "./acp-session-import-create.ts"
import { listBoundAcpSessionIds } from "./acp-session-bind.ts"
import { projectListedAcpSessions } from "./acp-session-import-project.ts"
import { acpListSpawnPlan } from "./acp-session-import-override.ts"
import { getCustomAgent, resolveCustomCwd } from "./agent-tools-custom"
import { getWorkspace } from "./workspace"

export async function listImportableAcpSessions(
  runtimeId: string,
  workspaceId: string
): Promise<ListAcpSessionsResult> {
  const workspace = await getWorkspace(workspaceId)
  const isCustom = isCustomAgentId(runtimeId)
  const custom = isCustom ? getCustomAgent(runtimeId) : undefined
  let customCwd: string | undefined
  if (custom) {
    try {
      customCwd = resolveCustomCwd(custom, workspace.rootPath)
    } catch (error) {
      return { supported: true, sessions: [], error: error instanceof Error ? error.message : String(error) }
    }
  }
  const plan = acpListSpawnPlan({
    runtimeId,
    isCustom,
    presetOverride: isCustom ? undefined : readAgentToolOverrides()[runtimeId],
    custom,
    customCwd,
    workspaceRoot: workspace.rootPath,
    workspaceIsSsh: workspace.kind === "ssh"
  })
  if (plan.kind === "unsupported") {
    return plan.error ? { supported: true, sessions: [], error: plan.error } : { supported: false, sessions: [] }
  }
  let remote: Awaited<ReturnType<typeof listAcpRemoteSessions>>
  try {
    remote = await listAcpRemoteSessions({
      id: runtimeId,
      cwd: plan.cwd,
      override: plan.override,
      ...(plan.env ? { env: plan.env } : {})
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
    cwd: plan.cwd
  })
}

export async function importAcpSession(input: ImportAcpSessionInput) {
  const created = await createImportedAcpSession(input)
  writeSessionRuntime(created.id, input.runtimeId)
  return created
}
