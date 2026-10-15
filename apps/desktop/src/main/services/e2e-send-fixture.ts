/**
 * 首发失败夹具：stub 路线抛出能走真实 classify / persist 的错误。
 * 闸：ENJOY_E2E_STUB=1 + 未打包 + 隔离 userData。打包态不生效。
 * `ENJOY_E2E_SEND_ONCE=1` 时只炸第一次，同进程后续发送走正常 stub。
 * `ENJOY_E2E_SEND_SKIP=N` 前 N 次照常成功；`ENJOY_E2E_SEND_DELAY_MS` 失败前先等。
 */
import { e2eChatReadySeedAllowed } from "./e2e-chat-readiness.ts"

export type E2eSendFixture = "unreachable" | "rejected" | "forbidden" | "billing"

let consumedOnce = false
let skipped = 0

export function resetE2eSendFixtureForTest(): void {
  consumedOnce = false
  skipped = 0
}

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
  // `ENJOY_E2E_SEND_SKIP=N`：同进程前 N 次发送照常成功，之后才炸（先站住一轮再失败的路径）。
  const skip = Number(env.ENJOY_E2E_SEND_SKIP ?? "")
  if (Number.isFinite(skip) && skip > 0 && skipped < skip) {
    skipped += 1
    return undefined
  }
  if (env.ENJOY_E2E_SEND_ONCE === "1") {
    if (consumedOnce) return undefined
    consumedOnce = true
  }
  return flag
}

/** 结构化状态交给 fail-agent-pump → classifyEnjoyLocalSendFailure。 */
export function e2eSendFixtureError(kind: E2eSendFixture): Error {
  if (kind === "rejected") return Object.assign(new Error("401"), { status: 401 })
  if (kind === "forbidden") return Object.assign(new Error("403"), { status: 403 })
  if (kind === "billing") return Object.assign(new Error("402"), { status: 402 })
  return Object.assign(new Error("connect ECONNREFUSED 127.0.0.1"), { code: "ECONNREFUSED" })
}

/**
 * `ENJOY_E2E_SEND_DELAY_MS`：夹具失败前先等这么久（上限 10s），e2e 才来得及在回滚前打字 / 切会话。
 * 只在夹具生效时用（同一道闸），非数字 / 负数当 0。
 */
export function e2eSendFixtureDelayMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.ENJOY_E2E_SEND_DELAY_MS ?? "")
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(parsed, 10_000)
}
