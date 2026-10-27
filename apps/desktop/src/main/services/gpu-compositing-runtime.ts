/**
 * 主进程玻璃旗标。complete info 只在启动拉一次。
 * gpu-info-update 只读已经更新的 feature status，不再回叫 complete info。
 */
import type { App, BrowserWindow } from "electron"
import {
  gpuCompositingFromStatus,
  hardwareAccelerationForcedOff,
  type GpuCompositingFlag
} from "./gpu-compositing"
import { gpuInfoLooksSoftware, softwareRendererSwitchOn } from "./gpu-compositing-software"
import {
  attachGpuCompositingWatch,
  pushGpuCompositingToWindows,
  shouldRequestCompleteGpuInfo
} from "./gpu-compositing-watch"

type GpuHost = {
  app: App
  disableHardwareAcceleration: boolean
  getWindows: () => BrowserWindow[]
}

export type GpuCompositingRuntime = {
  getFlag: () => GpuCompositingFlag
  /** 按当前采样推一次。建窗前调用，让 additionalArguments 和已开的窗对齐。 */
  publishCurrent: () => void
  refreshCompleteInfo: () => void
}

/** 装上监听并返回读旗标的口。调用时机要在建窗之前。 */
export function installGpuCompositing(host: GpuHost): GpuCompositingRuntime {
  let lastGpuInfo: unknown = null
  let inFlight = false
  const readFlag = (): GpuCompositingFlag => readLiveGpuFlag(host, lastGpuInfo)
  const publish = (flag: GpuCompositingFlag): void => {
    process.env.ENJOY_GPU_COMPOSITING = flag
    pushGpuCompositingToWindows(flag, host.getWindows())
  }
  const watch = attachGpuCompositingWatch({
    on: (event, listener) => bindGpuEvent(host.app, event, listener),
    readFlag,
    publish,
    current: "off"
  })
  return {
    getFlag: () => watch.getFlag(),
    publishCurrent: () => publish(readFlag()),
    refreshCompleteInfo: () => {
      if (!shouldRequestCompleteGpuInfo(inFlight)) return
      inFlight = true
      void host.app
        .getGPUInfo("complete")
        .then((info) => {
          lastGpuInfo = info
          publish(readFlag())
        })
        .catch(() => publish("off"))
        .finally(() => {
          inFlight = false
        })
    }
  }
}

function bindGpuEvent(
  app: App,
  event: "child-process-gone" | "gpu-info-update",
  listener: (...args: unknown[]) => void
): void {
  if (event === "child-process-gone") {
    app.on("child-process-gone", (nativeEvent, details) => listener(nativeEvent, details))
    return
  }
  app.on("gpu-info-update", () => {
    // 事件表示状态已经更新。回调里再要 complete info 会把同一事件打回来。
    listener()
  })
}

function readLiveGpuFlag(host: GpuHost, lastGpuInfo: unknown): GpuCompositingFlag {
  const forcedOff = hardwareAccelerationForcedOff({
    disableHardwareAcceleration: host.disableHardwareAcceleration,
    hasSwitch: (name) => host.app.commandLine.hasSwitch(name)
  })
  const software =
    softwareRendererSwitchOn({
      switchValue: (name) => host.app.commandLine.getSwitchValue(name)
    }) || gpuInfoLooksSoftware(lastGpuInfo)
  try {
    return gpuCompositingFromStatus(host.app.getGPUFeatureStatus(), {
      hardwareAccelerationDisabled: forcedOff,
      softwareRenderer: software
    })
  } catch {
    return "off"
  }
}

