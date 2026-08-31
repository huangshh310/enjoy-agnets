/**
 * Ask / Plan：Harness 内置写/改/命令直接禁用，不是 allow-reads 那种「批了再跑」。
 */
import type { AgentMode } from "@enjoy-agents/ipc-contract"

/** Claude Code 等适配器的常见突变内置工具名。 */
export const HARNESS_MUTATING_BUILTINS = ["write", "edit", "bash"] as const

export function inactiveToolsForMode(
  mode: AgentMode
): Array<(typeof HARNESS_MUTATING_BUILTINS)[number]> | undefined {
  if (mode !== "ask" && mode !== "plan") return undefined
  return [...HARNESS_MUTATING_BUILTINS]
}
