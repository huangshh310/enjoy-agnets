/**
 * luna（#145 后续 D）：ENJOY_E2E_SEND_WATCHDOG=1 让 stub 下的发送故意卡过看门狗，复现「这次没发出去」红卡与两条拼回提示。
 * 主进程判完（isE2eStub 同款 fail-closed：打包态 / 读不到 app 一律关）才把这个参数带给 preload。本文件不引 electron，preload 可用。
 */
export const E2E_SEND_WATCHDOG_ARG = "--enjoy-e2e-send-watchdog=1"

export function readE2eSendWatchdogArg(argv: readonly string[] = process.argv): boolean {
  return argv.includes(E2E_SEND_WATCHDOG_ARG)
}

/** main 判过 isE2eStub 才带：renderer 据此才露出会真打 agent.run / 上报焦点的 e2e 桥（leo soft #136）。 */
export const E2E_STUB_ARG = "--enjoy-e2e-stub=1"

export function readE2eStubArg(argv: readonly string[] = process.argv): boolean {
  return argv.includes(E2E_STUB_ARG)
}
