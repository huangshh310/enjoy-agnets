/**
 * 发送闸：只拦本轮选中的路线确定不可用。与 ready 共用 chatRouteGateCode。
 * 不确定（自定义 ACP / 未 inspect 的 CLI / Harness）放行，失败按真实错误分类。
 */
import {
  chatRouteGateCode,
  type ChatRouteGateInput,
  type SendGateCode
} from "@enjoy-agents/ipc-contract/chat-readiness"

export type SelectedRouteGateInput = ChatRouteGateInput & {
  /** 自动化 / 工作流子步 / ai.generate / 续跑 / 心跳不进闸。 */
  skip: boolean
}

export function shouldSkipSelectedRouteGate(input: {
  automationSource?: unknown
  rememberMru?: boolean
  isResume?: boolean
  isHeartbeat?: boolean
}): boolean {
  if (input.automationSource) return true
  if (input.rememberMru === false) return true
  return Boolean(input.isResume || input.isHeartbeat)
}

/** 只有 enjoy-local 确定不可用才回码：没路线 → no_chat_route；密钥无效 → credential_invalid。 */
export function selectedRouteGateCode(input: SelectedRouteGateInput): SendGateCode | null {
  return chatRouteGateCode(input)
}
