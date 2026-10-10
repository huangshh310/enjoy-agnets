/**
 * 发送闸：只拦确定不可用的 enjoy-local。
 * ready ⇒ 放行（单向）；未 ready 仍可能放行（远端 / 未 ping 的无密钥档案）。
 */
/** 没有任何可对话路线。区别于密钥无效 / 网络失败 / 额度用完。 */
export const NO_CHAT_ROUTE = "no_chat_route"

export type ChatRouteGateKind = "ok" | "uncertain" | "definitely_unusable"

export type ChatRouteGateInput = {
  skip?: boolean
  runtimeId: string
  codingRuntime?: "local" | "harness"
  /** 路由 hasSecret()，不是 apiKeys（ollama 无密钥也是 true）。 */
  hasEnjoySecret: boolean | "unknown"
  /**
   * 缓存里是否有 ping 通过的本机模型。
   * unknown / false 只算不确定，只驱动向导，不单独拦发送。
   */
  verifiedLocal: boolean | "unknown"
}

export function chatRouteGateKind(input: ChatRouteGateInput): ChatRouteGateKind {
  if (input.skip) return "ok"
  if (input.codingRuntime === "harness") return "ok"
  if (input.runtimeId !== "enjoy-local") return "ok"
  if (input.hasEnjoySecret === true) return "ok"
  if (input.verifiedLocal === true) return "ok"
  if (input.hasEnjoySecret === "unknown" || input.verifiedLocal === "unknown") return "uncertain"
  return "definitely_unusable"
}

export function chatRouteGateCode(input: ChatRouteGateInput): typeof NO_CHAT_ROUTE | null {
  return chatRouteGateKind(input) === "definitely_unusable" ? NO_CHAT_ROUTE : null
}

export function chatRouteAllowsSend(input: ChatRouteGateInput): boolean {
  return chatRouteGateCode(input) === null
}
