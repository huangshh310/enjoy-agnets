/**
 * 前台发送开跑前的可恢复失败：折成发送闸码 `{ ok:false, code }`，不 throw。
 * throw 会被 IPC 包成 "Error invoking remote method …" 英文原文，界面没法译；
 * 折码后 renderer 的 failComposerSend 还文、出可读 notice、删本次新建的空会话。
 * 续跑 / 自动化 / 心跳仍 throw：它们的调用方按异常收口（abandon / 记失败）。
 */
import {
  NEED_MODEL_CODE,
  SESSION_NOT_READY_CODE,
  type SendGateCode
} from "@enjoy-agents/ipc-contract/chat-readiness"

export type PreStartInput = {
  /** 续跑（带 runId）、自动化、心跳：不折码。 */
  interactive: boolean
  needsModel: boolean
  sessionExists: boolean
}

export function isInteractiveComposerRun(input: {
  isResume: boolean
  isHeartbeat: boolean
  automationSource?: unknown
}): boolean {
  return !input.isResume && !input.isHeartbeat && !input.automationSource
}

/** 只判模型。会话检查在取工作区之后，分开调。 */
export function preStartModelCode(input: Pick<PreStartInput, "interactive" | "needsModel">): SendGateCode | null {
  if (!input.interactive || !input.needsModel) return null
  return NEED_MODEL_CODE
}

export function preStartSessionCode(
  input: Pick<PreStartInput, "interactive" | "sessionExists">
): SendGateCode | null {
  if (!input.interactive || input.sessionExists) return null
  return SESSION_NOT_READY_CODE
}
