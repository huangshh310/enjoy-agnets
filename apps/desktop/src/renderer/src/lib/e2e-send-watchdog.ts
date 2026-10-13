/**
 * luna（#145 后续 D）：e2e 开关 ENJOY_E2E_SEND_WATCHDOG=1 时，发送在发出前故意多等一会，让看门狗先判失败。
 * 标记由 preload 暴露，只有主进程判过 e2e stub 闸（非打包）才会是 true；打包态恒为 false。
 */
import { SEND_WATCHDOG_MS } from "../hooks/runtime-interact/send-watchdog"

export function e2eSendWatchdogForced(): boolean {
  return typeof window !== "undefined" && (window as { enjoyE2eSendWatchdog?: unknown }).enjoyE2eSendWatchdog === true
}

/** 卡过看门狗：等 SEND_WATCHDOG_MS + 1.5s。 */
export async function holdPastSendWatchdogForE2e(): Promise<void> {
  if (!e2eSendWatchdogForced()) return
  await new Promise((resolve) => setTimeout(resolve, SEND_WATCHDOG_MS + 1_500))
}
