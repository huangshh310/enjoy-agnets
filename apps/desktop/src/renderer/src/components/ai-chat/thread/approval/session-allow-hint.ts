/**
 * 本会话钮文案：显示将记下的前缀 / 工具名；管道 / 解释器式命令只允许一次。
 * 前缀算法走 ipc-contract 叶子，禁止打 agent-core 主入口。
 */
import {
  bashAllowPrefix,
  bashCommandHasUnsafeOperators,
  bashCommandIsInterpreterStyle
} from "@enjoy-agents/ipc-contract/bash-prefix"

export function sessionAllowCardState(
  name: string,
  command: string
): { showSession: boolean; target: string; onceOnly: boolean } {
  const tool = name.trim()
  const text = command.trim()
  if (tool === "bash" || tool === "code_mode") {
    if (text && (bashCommandHasUnsafeOperators(text) || bashCommandIsInterpreterStyle(text))) {
      return { showSession: false, target: "", onceOnly: true }
    }
    const prefix = bashAllowPrefix(text)
    return { showSession: Boolean(prefix), target: prefix, onceOnly: false }
  }
  return { showSession: Boolean(tool), target: tool, onceOnly: false }
}
