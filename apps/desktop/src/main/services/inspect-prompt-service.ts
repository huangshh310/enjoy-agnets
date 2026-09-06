/**
 * agent.inspectPrompt：优先返回泵时快照，否则按库内消息做 preview。
 */
import { CODING_TOOL_NAMES } from "@enjoy-agents/agent-core"
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
import { listMessages } from "./session-queries"
import {
  getInspectPromptSnapshot,
  rememberInspectPrompt,
  sanitizeModelMessages
} from "./inspect-prompt-snapshot"
import { codingInstructions } from "./inspect-prompt-instructions"
import { toModelMessages } from "./to-model-messages"
import { getActiveCompactedHistory, getSessionCompaction } from "./session-compaction-service"

export function captureOpenStreamPrompt(input: {
  runId: string
  sessionId: string
  modelId: string
  mode: AgentMode
  messages: unknown[]
  prefs: { codingRuntime: string; customInstructions: string }
  runtimeId?: string
}) {
  const runtime = inspectRuntime(input.prefs.codingRuntime, input.runtimeId)
  rememberInspectPrompt({
    source: "last-run",
    capturedAt: Date.now(),
    runId: input.runId,
    sessionId: input.sessionId,
    modelId: input.modelId,
    mode: input.mode,
    runtime,
    instructions: codingInstructions(input.mode, runtime, input.prefs.customInstructions),
    messages: sanitizeModelMessages(input.messages),
    toolNames: [...CODING_TOOL_NAMES, ...Object.keys(createMcpAgentTools())]
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
  const runtime = inspectRuntime(prefs.codingRuntime, prefs.runtimeId)
  const rows = await listMessages(input.sessionId)
  const rawHistory = rows.map((row) => historyFromRow(row.role, row.content))
  const history = await getActiveCompactedHistory(input.sessionId, rawHistory)
  const mcpNames = Object.keys(createMcpAgentTools())
  return {
    source: "preview",
    capturedAt: Date.now(),
    sessionId: input.sessionId,
    modelId: input.modelId ?? "",
    mode,
    runtime,
    instructions: codingInstructions(mode, runtime, prefs.customInstructions),
    messages: sanitizeModelMessages(toModelMessages(history)),
    toolNames: [...CODING_TOOL_NAMES, ...mcpNames]
  }
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
