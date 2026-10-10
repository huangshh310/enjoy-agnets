/**
 * 本会话钮文案：显示将记下的前缀 / 工具名；含管道的命令只允许一次。
 */
import { bashAllowPrefix, bashCommandHasUnsafeOperators } from "@enjoy-agents/agent-core"

export function sessionAllowCardState(
  name: string,
  command: string
): { showSession: boolean; target: string; onceOnly: boolean } {
  const tool = name.trim()
  const text = command.trim()
  if (tool === "bash" || tool === "code_mode") {
    if (text && bashCommandHasUnsafeOperators(text)) {
      return { showSession: false, target: "", onceOnly: true }
    }
    const prefix = bashAllowPrefix(text)
    return { showSession: Boolean(prefix), target: prefix, onceOnly: false }
  }
  return { showSession: Boolean(tool), target: tool, onceOnly: false }
}
