/**
 * 本会话钮文案：bash 显示将记下的整条命令（只认完全相同）/ 工具名；管道 / 解释器式命令只允许一次。
 * 规范化算法走 ipc-contract 叶子，禁止打 agent-core 主入口。
 */
import {
  bashAllowCommand,
  bashCommandHasUnsafeOperators,
  bashCommandIsInterpreterStyle
} from "@enjoy-agents/ipc-contract/bash-prefix"
import { WRITE_TOOLS } from "@enjoy-agents/ipc-contract/tool-names"

export type SessionAllowOnceKind = "pipe" | "interpreter"

export function sessionAllowCardState(
  name: string,
  command: string
): {
  showSession: boolean
  target: string
  onceOnly: boolean
  onceKind?: SessionAllowOnceKind
  writeGroup?: boolean
  bashExact?: boolean
} {
  const tool = name.trim()
  const text = command.trim()
  if (tool === "bash" || tool === "code_mode") {
    if (text && bashCommandIsInterpreterStyle(text)) {
      return { showSession: false, target: "", onceOnly: true, onceKind: "interpreter" }
    }
    if (text && bashCommandHasUnsafeOperators(text)) {
      return { showSession: false, target: "", onceOnly: true, onceKind: "pipe" }
    }
    const exact = bashAllowCommand(text)
    return exact
      ? { showSession: true, target: exact, onceOnly: false, bashExact: true }
      : { showSession: false, target: "", onceOnly: false }
  }
  if (WRITE_TOOLS.includes(tool) && tool !== "code_mode") {
    return { showSession: Boolean(tool), target: tool, onceOnly: false, writeGroup: true }
  }
  return { showSession: Boolean(tool), target: tool, onceOnly: false }
}
