/**
 * 运行时重算玻璃棱镜旗标。默认 off；只在确认硬件合成时开。
 * GPU 子进程退出立刻关，不信启动瞬间的采样。
 */
import type { GpuCompositingFlag } from "./gpu-compositing"

export type GpuChildGoneDetails = { type?: string }

export function isGpuChildProcessGone(details: GpuChildGoneDetails | undefined): boolean {
  return details?.type === "GPU"
}

/** GPU 子进程挂了：一律 off。其它类型不改。 */
export function flagAfterGpuChildGone(
  details: GpuChildGoneDetails | undefined,
  current: GpuCompositingFlag
): GpuCompositingFlag {
  return isGpuChildProcessGone(details) ? "off" : current
}

export function pushGpuCompositingScript(flag: GpuCompositingFlag): string {
  return `document.documentElement.setAttribute("data-gpu-compositing", ${JSON.stringify(flag)})`
}

export function pushGpuCompositingToWindows(
  flag: GpuCompositingFlag,
  windows: ReadonlyArray<{
    isDestroyed: () => boolean
    webContents: { isDestroyed: () => boolean; executeJavaScript: (code: string) => Promise<unknown> }
  }>
): void {
  const script = pushGpuCompositingScript(flag)
  for (const win of windows) {
    if (win.isDestroyed() || win.webContents.isDestroyed()) continue
    void win.webContents.executeJavaScript(script).catch(() => undefined)
  }
}

type WatchEvents = "child-process-gone" | "gpu-info-update"

export function attachGpuCompositingWatch(input: {
  on: (event: WatchEvents, listener: (...args: unknown[]) => void) => void
  readFlag: () => GpuCompositingFlag
  publish: (flag: GpuCompositingFlag) => void
  current?: GpuCompositingFlag
}): { getFlag: () => GpuCompositingFlag } {
  let current: GpuCompositingFlag = input.current ?? "off"
  const publish = (flag: GpuCompositingFlag) => {
    current = flag
    input.publish(flag)
  }
  input.on("child-process-gone", (_event, details) => {
    const next = flagAfterGpuChildGone(details as GpuChildGoneDetails, current)
    if (next === "off") publish("off")
  })
  input.on("gpu-info-update", () => {
    publish(input.readFlag())
  })
  return { getFlag: () => current }
}
