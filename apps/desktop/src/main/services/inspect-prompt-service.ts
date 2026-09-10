/**
 * agent.inspectPrompt：优先返回泵时快照，否则按库内消息做 preview。
 */
import { codingToolNamesFor } from "@enjoy-agents/agent-core"
import {
  InspectPromptInput,
  type AgentMode,
  type InspectPromptResult,
  parseAssistantPayload
} from "@enjoy-agents/ipc-contract"
import { createMcpAgentTools } from "./mcp-agent-tools"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import { isE2eStub } from "./e2e-stub"
import { readPreferences } from "./preferences"
import { listDiscoveredRules } from "./rules-service"
import { listInstalledSkills } from "./skills-service"
import { listMessages, workspaceRootForSession } from "./session-queries"
import {
  getInspectPromptSnapshot,
  rememberInspectPrompt,
  sanitizeModelMessages
} from "./inspect-prompt-snapshot"
import { resolveRuntimeId } from "./agent-run-helpers"
import { formatWorkspaceAgentsMd } from "./agents-md-discover"
import { codingInstructions, inspectListedToolNames } from "./inspect-prompt-instructions"
import { toModelMessages } from "./to-model-messages"
import { getActiveCompactedHistory, getSessionCompaction } from "./session-compaction-service"

export async function captureOpenStreamPrompt(input: {
  runId: string
  sessionId: string
  modelId: string
  mode: AgentMode
  messages: unknown[]
  prefs: { codingRuntime: string; customInstructions: string }
  runtimeId?: string
  workspaceRoot?: string
}) {
  const runtime = inspectRuntime(input.prefs.codingRuntime, input.runtimeId)
  const compaction = await getSessionCompaction(input.sessionId)
  rememberInspectPrompt({
    source: "last-run",
    capturedAt: Date.now(),
    runId: input.runId,
    sessionId: input.sessionId,
    modelId: input.modelId,
    mode: input.mode,
    runtime,
    instructions: composeInspectInstructions(
      input.mode,
      runtime,
      input.prefs.customInstructions,
      input.workspaceRoot,
      { rehydratedAfterCompact: Boolean(compaction) }
    ),
    messages: sanitizeModelMessages(input.messages),
    toolNames: inspectListedToolNames(runtime, [
      ...codingToolNamesFor(input.mode),
      ...Object.keys(createMcpAgentTools({ mode: input.mode }))
    ])
  })
}

export async function inspectPrompt(raw: unknown): Promise<InspectPromptResult> {
  const input = InspectPromptInput.parse(raw)
  const snapshot = getInspectPromptSnapshot(input.sessionId)
  if (snapshot && (await isSnapshotCurrent(input.sessionId, snapshot.capturedAt))) {
    return snapshot
  }
  return previewPrompt(input)
}

/** 压缩时间晚于快照时，快照已过期，走 preview 注入 SUMMARY。 */
async function isSnapshotCurrent(sessionId: string, capturedAt: number): Promise<boolean> {
  const compaction = await getSessionCompaction(sessionId)
  return !compaction || capturedAt >= compaction.compactedAt
}

async function previewPrompt(input: InspectPromptInput): Promise<InspectPromptResult> {
  const prefs = readPreferences()
  const mode = input.mode ?? prefs.defaultMode
  // 跟开流同一套：会话覆盖 > 偏好。禁止只用 prefs.runtimeId，否则切到 CLI 未发过轮时检查器仍画 ToolLoop 提示词。
  const runtimeId = resolveRuntimeId({ sessionId: input.sessionId }, prefs)
  const runtime = inspectRuntime(prefs.codingRuntime, runtimeId)
  const rows = await listMessages(input.sessionId)
  const rawHistory = rows.map((row) => historyFromRow(row.role, row.content))
  const history = await getActiveCompactedHistory(input.sessionId, rawHistory)
  const mcpNames = Object.keys(createMcpAgentTools({ mode }))
  const workspaceRoot = await workspaceRootForSession(input.sessionId)
  const compaction = await getSessionCompaction(input.sessionId)
  return {
    source: "preview",
    capturedAt: Date.now(),
    sessionId: input.sessionId,
    modelId: input.modelId ?? "",
    mode,
    runtime,
    instructions: composeInspectInstructions(mode, runtime, prefs.customInstructions, workspaceRoot, {
      rehydratedAfterCompact: Boolean(compaction)
    }),
    messages: sanitizeModelMessages(toModelMessages(history)),
    toolNames: inspectListedToolNames(runtime, [...codingToolNamesFor(mode), ...mcpNames])
  }
}

function composeInspectInstructions(
  mode: AgentMode,
  runtime: InspectPromptResult["runtime"],
  customInstructions: string,
  workspaceRoot?: string,
  extras?: { rehydratedAfterCompact?: boolean }
) {
  const rules = workspaceRoot ? listDiscoveredRules({ workspacePath: workspaceRoot }) : []
  const skills = listInstalledSkills(workspaceRoot ? { workspacePath: workspaceRoot } : undefined)
  const agentsMd = workspaceRoot ? formatWorkspaceAgentsMd(workspaceRoot) : ""
  return codingInstructions(mode, runtime, customInstructions, rules, {
    skills,
    workspaceRoot,
    agentsMd,
    rehydratedAfterCompact: extras?.rehydratedAfterCompact
  })
}

function inspectRuntime(
  codingRuntime: string,
  runtimeId?: string
): "e2e" | "acp-host" | "harness" | "local" {
  if (isE2eStub()) return "e2e"
  if (isAcpHostRuntime(runtimeId)) return "acp-host"
  if (codingRuntime === "harness") return "harness"
  return "local"
}

function historyFromRow(role: string, content: string) {
  if (role === "assistant") {
    const parsed = parseAssistantPayload(content)
    return { role: "assistant", content: parsed.content, reasoning: parsed.reasoning }
  }
  return { role, content }
}
