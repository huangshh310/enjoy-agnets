/**
 * ACP 开流前的思考档种子。live configOptions 优先。
 * 档位跟官方 CLI 广告走，不把 max/ultra 并进 Enjoy 五档。
 */
import type { SessionConfigOption } from "./session-config.ts"

const LOW_MEDIUM_HIGH: SessionConfigOption["choices"] = [
  { value: "low", name: "Low" },
  { value: "medium", name: "Medium" },
  { value: "high", name: "High" }
]

const LOW_TO_XHIGH: SessionConfigOption["choices"] = [
  ...LOW_MEDIUM_HIGH,
  { value: "xhigh", name: "Extra high" }
]

const CLAUDE_EFFORT: SessionConfigOption["choices"] = [
  ...LOW_TO_XHIGH,
  { value: "max", name: "Max" }
]

const CODEX_EFFORT: SessionConfigOption["choices"] = [
  { value: "minimal", name: "Minimal" },
  ...LOW_TO_XHIGH
]

export function thoughtSeedFor(
  runtimeId: string | undefined,
  modelId?: string
): SessionConfigOption | undefined {
  if (runtimeId === "grok") {
    const wide = !modelId || modelId.includes("4.6") || modelId.includes("grok-4.6")
    return option("reasoning_effort", "Reasoning effort", wide ? LOW_TO_XHIGH : LOW_MEDIUM_HIGH, "high")
  }
  if (runtimeId === "claude") {
    if (modelId && /haiku/i.test(modelId)) return undefined
    return option("effort", "Effort", CLAUDE_EFFORT, "high")
  }
  if (runtimeId === "codex") {
    return option("reasoning_effort", "Reasoning effort", CODEX_EFFORT, "medium")
  }
  return undefined
}

function option(
  id: string,
  name: string,
  choices: SessionConfigOption["choices"],
  currentValue: string
): SessionConfigOption {
  return { id, name, category: "thought_level", type: "select", currentValue, choices }
}
