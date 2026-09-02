/**
 * 本机 ToolLoop 只用 systemPromptFor；Harness 才拼 customInstructions。
 */
import { systemPromptFor } from "@enjoy-agents/agent-core"
import type { AgentMode, InspectPromptResult } from "@enjoy-agents/ipc-contract"

export function codingInstructions(
  mode: AgentMode,
  runtime: InspectPromptResult["runtime"],
  customInstructions: string
): string {
  const base = systemPromptFor(mode)
  if (runtime !== "harness") return base
  const extra = customInstructions.trim()
  return extra ? `${base}\n${extra}` : base
}
