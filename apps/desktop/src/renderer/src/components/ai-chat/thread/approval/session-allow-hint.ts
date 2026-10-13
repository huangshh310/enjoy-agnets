/**
 * 本会话钮文案：bash 显示将记下的整条命令（只认完全相同）/ 工具名；管道 / 解释器式命令只允许一次。
 * 规范化算法走 ipc-contract 叶子，禁止打 agent-core 主入口。
 */
import {
  bashAllowCommand,
  bashCommandHasUnsafeOperators,
  bashCommandIsInterpreterStyle,
  bashCommandTooLongForSession
} from "@enjoy-agents/ipc-contract/bash-prefix"
import { WRITE_TOOLS } from "@enjoy-agents/ipc-contract/tool-names"

export type SessionAllowOnceKind = "pipe" | "interpreter" | "too_long"

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
  // code_mode 跑的是一段脚本（path + source），本版只允许一次，不记。
  if (tool === "code_mode") {
    return { showSession: false, target: "", onceOnly: true, onceKind: "interpreter" }
  }
  if (tool === "bash") {
    // leo soft 1：与 main（bashAllowCommand 量原始长度）一致，用未 trim 的原文量 4096。
    if (text && bashCommandTooLongForSession(command)) {
      return { showSession: false, target: "", onceOnly: true, onceKind: "too_long" }
    }
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
