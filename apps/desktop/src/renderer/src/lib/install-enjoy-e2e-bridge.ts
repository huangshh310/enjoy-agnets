/**
 * E2E 桥的挂载点（唯一写 window.__enjoyE2e 的地方）。
 * leo（#136）：会真打 agent.run / 上报焦点的两条只给 e2e stub（preload 按 main 的 isE2eStub 标记露出）；
 * 打包版没有标记 → 默认摘掉（fail closed）。拆成独立小模块，单测能用桩 window 真调。
 */
import { publishE2eBridge } from "./e2e-bridge-gate.ts"

type BridgeWindow = { __enjoyE2e?: unknown; enjoyE2eStub?: unknown }

export function installEnjoyE2eBridge<T extends object>(win: BridgeWindow | undefined, createBridge: () => T): void {
  if (!win) return
  const bridge = createBridge()
  publishE2eBridge(win, bridge)
}
