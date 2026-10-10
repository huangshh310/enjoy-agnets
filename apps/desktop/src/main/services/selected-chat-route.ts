/**
 * 发送闸：只拦本轮选中的路线确定不可用。与 ready 共用 chatRouteGateCode。
 * 不确定（自定义 ACP / 未 inspect 的 CLI / Harness）放行，失败按真实错误分类。
 */
import { chatRouteGateCode, NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"

export type SelectedRouteGateInput = {
  /** 自动化 / 工作流子步 / ai.generate / 续跑 / 心跳不进闸。 */
  skip: boolean
  runtimeId: string
  codingRuntime: "local" | "harness"
  /** 快照 apiKeys，不是 hasSecret（ollama 无密钥也是 true）。 */
  hasEnjoySecret: boolean | "unknown"
  /**
   * 缓存里是否有 ping 通过的本机模型。
   * 从未算过快照 = unknown，放行（发送路径禁止同步等 ping）。
   */
  verifiedLocal: boolean | "unknown"
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

/** 只有 enjoy-local 且没密钥、也没已验证本机模型时回 no_chat_route。 */
export function selectedRouteGateCode(input: SelectedRouteGateInput): typeof NO_CHAT_ROUTE | null {
  return chatRouteGateCode(input)
}
