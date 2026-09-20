/**
 * 规则 mode → 开流内部值。C 端只露探索/执行。
 */
import type { AutomationMode } from "@enjoy-agents/ipc-contract"

const OPEN = "[Enjoy host mode:"
const CLOSE = "[/Enjoy host mode]"

export function resolveAutomationMode(mode?: AutomationMode): "plan" | "agent" {
  return mode === "plan" || mode === "ask" ? "plan" : "agent"
}

/** ACP 没有 set_mode：探索围栏垫进 prompt。Enjoy Local 走 ToolLoop。 */
export function applyAutomationHostMode(isAcp: boolean, mode: "plan" | "agent", prompt: string): string {
  if (!isAcp || mode === "agent" || prompt.includes(OPEN)) return prompt
  const body =
    "The host switched this session to plan mode. Investigate the workspace and write a concrete step-by-step implementation plan. Do not edit files or run mutating commands."
  return `${OPEN} ${mode}]\n${body}\n${CLOSE}\n\n${prompt.trim()}`
}
