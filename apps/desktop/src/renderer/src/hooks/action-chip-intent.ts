/**
 * 引导词点击意图：idle 新开一轮；running 才看 queue / fill_input。
 */
import type { ActionChip } from "@enjoy-agents/ipc-contract"

export function resolveActionChipIntent(
  running: boolean,
  actionType: ActionChip["actionType"]
): "send" | "queue" | "fill_input" {
  if (!running) return "send"
  return actionType
}
