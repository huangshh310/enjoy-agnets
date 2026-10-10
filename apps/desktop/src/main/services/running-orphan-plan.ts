/**
 * running 孤儿能否在工具边界续跑。不碰 Electron / DB，方便 node:test。
 */
import { coerceAgentRunOrigin, type AgentRunOrigin } from "@enjoy-agents/ipc-contract/agent-run-origin"

export const TOOL_BOUNDARY = "tool-boundary"

export type AgentCheckpointExtras = {
  modelMessages?: unknown
  pendingApprovals?: unknown
  runtimeId?: string
  resumeAt?: string
  denyAnyDesktop?: boolean
  automationSource?: unknown
  origin?: AgentRunOrigin
}

export function runningCheckpointFlags(input: {
  denyAnyDesktop?: boolean
  automationSource?: unknown
  origin?: unknown
}): { denyAnyDesktop?: boolean; automationSource?: unknown; origin?: AgentRunOrigin } {
  return {
    denyAnyDesktop: input.denyAnyDesktop === true ? true : undefined,
    automationSource: input.automationSource,
    origin: coerceAgentRunOrigin(input.origin)
  }
}

export function parseAgentCheckpointExtras(raw: string | null | undefined): AgentCheckpointExtras {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as AgentCheckpointExtras
    return {
      modelMessages: parsed.modelMessages,
      pendingApprovals: parsed.pendingApprovals,
      runtimeId: typeof parsed.runtimeId === "string" ? parsed.runtimeId : undefined,
      resumeAt: typeof parsed.resumeAt === "string" ? parsed.resumeAt : undefined,
      denyAnyDesktop: parsed.denyAnyDesktop === true,
      automationSource: parsed.automationSource,
      origin: coerceAgentRunOrigin(parsed.origin)
    }
  } catch {
    return {}
  }
}

/** 必须有工具边界快照。审批中的 extras 应走 waiting_review，不在这里续泵。 */
export function canResumeRunningOrphan(row: {
  status: string
  kind: string
  workspaceId: string | null
  checkpoint: string | null
}): boolean {
  if (row.status !== "running" || row.kind !== "agent" || !row.workspaceId) return false
  const extras = parseAgentCheckpointExtras(row.checkpoint)
  if (extras.resumeAt !== TOOL_BOUNDARY) return false
  if (!Array.isArray(extras.modelMessages) || extras.modelMessages.length === 0) return false
  if (Array.isArray(extras.pendingApprovals) && extras.pendingApprovals.length > 0) return false
  return true
}
