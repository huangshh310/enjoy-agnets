/**
 * 发送闸：只拦确定不可用的 enjoy-local。
 * ready ⇒ 放行（单向）。unverified 也 ready，闸放行，首发再验。
 * 只有 invalid 不 ready、不放行。
 */
import { CREDENTIAL_INVALID, type CredentialCheckState } from "./credential-check.ts"

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
  /** 当前路线密钥校验。invalid 拦发送；unverified 放行。 */
  credentialState?: CredentialCheckState
}

export function chatRouteGateKind(input: ChatRouteGateInput): ChatRouteGateKind {
  if (input.skip) return "ok"
  if (input.codingRuntime === "harness") return "ok"
  if (input.runtimeId !== "enjoy-local") return "ok"
  if (input.credentialState === "invalid") return "definitely_unusable"
  if (input.hasEnjoySecret === true) {
    return input.credentialState === "unverified" ? "uncertain" : "ok"
  }
  if (input.verifiedLocal === true) return "ok"
  if (input.hasEnjoySecret === "unknown" || input.verifiedLocal === "unknown") return "uncertain"
  return "definitely_unusable"
}

export function chatRouteGateCode(
  input: ChatRouteGateInput
): typeof NO_CHAT_ROUTE | typeof CREDENTIAL_INVALID | null {
  if (chatRouteGateKind(input) !== "definitely_unusable") return null
  return input.credentialState === "invalid" ? CREDENTIAL_INVALID : NO_CHAT_ROUTE
}

export function chatRouteAllowsSend(input: ChatRouteGateInput): boolean {
  return chatRouteGateCode(input) === null
}
