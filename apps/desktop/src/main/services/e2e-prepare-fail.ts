/**
 * jojo P2 e2e：ENJOY_E2E_PREPARE_FAIL=1 时开泵前抛「需要视觉模型」，复现准备阶段失败。
 * 值为首字前失败码时按该码抛（行为测试用来走真开跑链路的首字前回滚）。
 * 只在 isE2eStub()（非打包 + 隔离 userData + ENJOY_E2E_STUB=1）时生效。
 */
import { MODEL_NEEDS_VISION } from "@enjoy-agents/ipc-contract/run-error-codes"
import { isPreOutputFailureCode } from "@enjoy-agents/ipc-contract/pre-output-failure"
import { isE2eStub } from "./e2e-stub-gate"

export function e2ePrepareFailForced(
  env: Record<string, string | undefined> = process.env,
  stub: () => boolean = isE2eStub
): boolean {
  const value = env.ENJOY_E2E_PREPARE_FAIL
  return (value === "1" || isPreOutputFailureCode(value)) && stub()
}

export function throwIfE2ePrepareFail(
  env: Record<string, string | undefined> = process.env,
  stub: () => boolean = isE2eStub
): void {
  if (!e2ePrepareFailForced(env, stub)) return
  // 值为首字前失败码（如 provider_unreachable）时按该码抛，走首字前回滚；"1" 仍是「需要视觉模型」。
  const value = env.ENJOY_E2E_PREPARE_FAIL
  throw new Error(value && value !== "1" ? value : MODEL_NEEDS_VISION)
}
