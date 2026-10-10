/**
 * 本会话钮文案：显示将记下的前缀 / 工具名；管道 / 解释器式命令只允许一次。
 * 前缀算法走 ipc-contract 叶子，禁止打 agent-core 主入口。
 */
import {
  bashAllowPrefix,
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
    const prefix = bashAllowPrefix(text)
    return { showSession: Boolean(prefix), target: prefix, onceOnly: false }
  }
  if (WRITE_TOOLS.includes(tool) && tool !== "code_mode") {
    return { showSession: Boolean(tool), target: tool, onceOnly: false, writeGroup: true }
  }
  return { showSession: Boolean(tool), target: tool, onceOnly: false }
}
