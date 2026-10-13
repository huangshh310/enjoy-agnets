/**
 * jojo P2 e2e：ENJOY_E2E_PREPARE_FAIL=1 时开泵前抛「需要视觉模型」，复现准备阶段失败。
 * 只在 isE2eStub()（非打包 + 隔离 userData + ENJOY_E2E_STUB=1）时生效。
 */
import { MODEL_NEEDS_VISION } from "@enjoy-agents/ipc-contract/run-error-codes"
import { isE2eStub } from "./e2e-stub-gate"

export function e2ePrepareFailForced(
  env: Record<string, string | undefined> = process.env,
  stub: () => boolean = isE2eStub
): boolean {
  return env.ENJOY_E2E_PREPARE_FAIL === "1" && stub()
}

export function throwIfE2ePrepareFail(
  env: Record<string, string | undefined> = process.env,
  stub: () => boolean = isE2eStub
): void {
  if (e2ePrepareFailForced(env, stub)) throw new Error(MODEL_NEEDS_VISION)
}
