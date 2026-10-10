/**
 * 首发失败夹具：stub 路线抛出能走真实 classify / persist 的错误。
 * 闸：ENJOY_E2E_STUB=1 + 未打包 + 隔离 userData。打包态不生效。
 */
import { e2eChatReadySeedAllowed } from "./e2e-chat-readiness.ts"

export type E2eSendFixture = "unreachable" | "rejected" | "forbidden" | "billing"

export function e2eSendFixture(
  env: NodeJS.ProcessEnv = process.env,
  packaged = false,
  userData?: string
): E2eSendFixture | undefined {
  const flag = env.ENJOY_E2E_SEND
  if (flag !== "unreachable" && flag !== "rejected" && flag !== "forbidden" && flag !== "billing") {
    return undefined
  }
  if (!e2eChatReadySeedAllowed({ env, packaged, userData })) return undefined
  return flag
}

/** 结构化状态交给 fail-agent-pump → classifyEnjoyLocalSendFailure。 */
export function e2eSendFixtureError(kind: E2eSendFixture): Error {
  if (kind === "rejected") return Object.assign(new Error("401"), { status: 401 })
  if (kind === "forbidden") return Object.assign(new Error("403"), { status: 403 })
  if (kind === "billing") return Object.assign(new Error("402"), { status: 402 })
  return new Error("ECONNREFUSED")
}
