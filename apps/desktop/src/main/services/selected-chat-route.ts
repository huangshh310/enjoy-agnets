/**
 * 发送闸：只拦本轮选中的路线确定不可用。全局 readiness 只给向导。
 * 不确定（自定义 ACP / 未 inspect 的 CLI / Harness）放行，失败按真实错误分类。
 */
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"

export type SelectedRouteGateInput = {
  /** 自动化 / 工作流子步 / ai.generate / 续跑 / 心跳不进闸。 */
  skip: boolean
  runtimeId: string
  codingRuntime: "local" | "harness"
  /** 与 resolveRunSecret 同一条 hasSecret。 */
  hasEnjoySecret: boolean
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
  if (input.skip) return null
  if (input.codingRuntime === "harness") return null
  if (input.runtimeId !== "enjoy-local") return null
  if (input.hasEnjoySecret) return null
  if (input.verifiedLocal === "unknown" || input.verifiedLocal) return null
  return NO_CHAT_ROUTE
}
