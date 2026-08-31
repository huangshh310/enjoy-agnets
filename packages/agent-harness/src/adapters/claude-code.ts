/**
 * Claude Code 桥接适配器。沙箱必须能暴露端口。
 */
import { HarnessAgent } from "@ai-sdk/harness/agent"
import { createClaudeCode } from "@ai-sdk/harness-claude-code"
import { createAdapterSandbox } from "../sandbox-for.ts"
import { resolveHarnessAdapter } from "../catalog.ts"
import { requireProviderKey, sharedHarnessSettings } from "./shared.ts"
import type { CreateHarnessCodingAgentInput } from "../types.ts"

const CLAUDE_MODELS = new Set(["sonnet", "opus", "haiku"])

function claudeModel(model?: string): { model: string } | Record<string, never> {
  if (!model) return {}
  return CLAUDE_MODELS.has(model) ? { model } : {}
}

export function createClaudeCodeAgent(input: CreateHarnessCodingAgentInput) {
  const adapter = resolveHarnessAdapter("claude-code", input.providerKind)
  if (!adapter) throw new Error("Claude Code adapter is missing from the catalog.")
  const key = requireProviderKey(input, "Anthropic")
  return new HarnessAgent({
    harness: createClaudeCode({
      env: { ANTHROPIC_API_KEY: key }
    }),
    sandbox: createAdapterSandbox(adapter, input),
    id: "enjoy-agents-claude-code",
    ...sharedHarnessSettings(input),
    ...claudeModel(input.model)
  })
}
