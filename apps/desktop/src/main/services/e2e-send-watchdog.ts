/**
 * ENJOY_E2E_SEND_WATCHDOG=1：只在 isE2eStub()（非打包 + 隔离 userData + ENJOY_E2E_STUB=1）时生效。
 */
import { isE2eStub } from "./e2e-stub-gate"
import { E2E_SEND_WATCHDOG_ARG } from "./e2e-send-watchdog-arg"

export function e2eSendWatchdogForced(
  env: Record<string, string | undefined> = process.env,
  stub: () => boolean = isE2eStub
): boolean {
  return env.ENJOY_E2E_SEND_WATCHDOG === "1" && stub()
}

export function e2eSendWatchdogArgs(
  env: Record<string, string | undefined> = process.env,
  stub: () => boolean = isE2eStub
): string[] {
  return e2eSendWatchdogForced(env, stub) ? [E2E_SEND_WATCHDOG_ARG] : []
}
