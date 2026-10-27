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

type GpuContents = {
  isDestroyed: () => boolean
  isLoading?: () => boolean
  executeJavaScript: (code: string) => Promise<unknown>
  /** 加载中不排脚本。用 did-finish-load 补写，不要用 did-stop-loading。 */
  once?: (event: "did-finish-load", listener: () => void) => void
}

const pendingFlag = new WeakMap<GpuContents, GpuCompositingFlag>()
const flushArmed = new WeakSet<GpuContents>()

function writeGpuFlag(contents: GpuContents, flag: GpuCompositingFlag): void {
  void contents.executeJavaScript(pushGpuCompositingScript(flag)).catch(() => undefined)
}

/** 加载中只记最新旗标，并给这个 webContents 挂一次加载结束补写。 */
function armGpuFlagFlush(contents: GpuContents, flag: GpuCompositingFlag): void {
  pendingFlag.set(contents, flag)
  if (!contents.once || flushArmed.has(contents)) return
  flushArmed.add(contents)
  contents.once("did-finish-load", () => {
    flushArmed.delete(contents)
    const next = pendingFlag.get(contents)
    pendingFlag.delete(contents)
    if (next == null || contents.isDestroyed()) return
    if (contents.isLoading?.()) {
      armGpuFlagFlush(contents, next)
      return
    }
    writeGpuFlag(contents, next)
  })
}

export function pushGpuCompositingToWindows(
  flag: GpuCompositingFlag,
  windows: ReadonlyArray<{ isDestroyed: () => boolean; webContents: GpuContents }>
): void {
  for (const win of windows) {
    const contents = win.webContents
    if (win.isDestroyed() || contents.isDestroyed()) continue
    // 加载中 executeJavaScript 会 once('did-stop-loading')，启动期反复推会把监听堆过 10。
    if (contents.isLoading?.()) {
      armGpuFlagFlush(contents, flag)
      continue
    }
    // 已经写过最新值。丢掉加载中记下的旧旗标，避免 did-finish-load 再盖回来。
    pendingFlag.delete(contents)
    writeGpuFlag(contents, flag)
  }
}

/**
 * complete info 只能在启动时要一次。进行中不再要。
 * gpu-info-update 里再要 complete info 会把同一事件打回来。
 */
export function shouldRequestCompleteGpuInfo(inFlight: boolean): boolean {
  return !inFlight
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
