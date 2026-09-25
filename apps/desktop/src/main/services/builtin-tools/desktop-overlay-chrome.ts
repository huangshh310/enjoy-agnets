/**
 * CU-P0-C overlay 生命周期：act 开始亮、结束/取消/失败/停熄。
 * 不发空成功条。Esc / 一键停走同一条 abort。
 */
import { app, globalShortcut } from "electron"
import { getBuiltinToolsState } from "./builtin-tools-state"
import { overlayChromeCopy, shouldShowDesktopOverlay } from "./desktop-overlay-visibility"
import { sendOverlayChrome } from "./screen-overlay-service"
import { listActiveRuns } from "../agent-run-state"
import { readPreferences } from "../preferences"

let overlayOn = false
let previewTimer: ReturnType<typeof setTimeout> | null = null
let previewOnly = false
let controllingRunId: string | undefined
let escBound = false

function overlayLocale(): "zh" | "en" {
  const language = readPreferences().language
  if (language === "en") return "en"
  if (language === "auto") {
    try {
      return app.getLocale().toLowerCase().startsWith("en") ? "en" : "zh"
    } catch {
      return "zh"
    }
  }
  return "zh"
}

function clearPreviewTimer(): void {
  if (!previewTimer) return
  clearTimeout(previewTimer)
  previewTimer = null
}

function bindEscStop(): void {
  if (escBound) return
  try {
    escBound = globalShortcut.register("Escape", () => {
      void stopDesktopActOverlay()
    })
  } catch {
    escBound = false
  }
}

function unbindEscStop(): void {
  if (!escBound) return
  try {
    globalShortcut.unregister("Escape")
  } catch {
    // 其它模块可能已卸
  }
  escBound = false
}

function paintOverlay(appName: string): void {
  sendOverlayChrome({ visible: true, ...overlayChromeCopy(overlayLocale(), appName) })
  overlayOn = true
  bindEscStop()
}

export function isDesktopOverlayVisible(): boolean {
  return overlayOn
}

/** 已批目标开始 click/type/key/… 时点亮。wait / 关开关不亮。 */
export function beginDesktopActOverlay(input: { action: string; appName?: string; runId?: string }): void {
  const state = getBuiltinToolsState()
  if (
    !shouldShowDesktopOverlay({
      action: input.action,
      enabled: state.computerUse.enabled,
      screenVisuals: state.computerUse.screenVisuals
    })
  ) {
    return
  }
  clearPreviewTimer()
  previewOnly = false
  controllingRunId = input.runId ?? inferPumpingRunId()
  paintOverlay(input.appName ?? "")
}

function inferPumpingRunId(): string | undefined {
  return listActiveRuns().find((item) => item.run.pumping)?.runId
}

/** 结束 / 失败 / 二次确认停卡：立刻熄，不画成功条。 */
export function endDesktopActOverlay(): void {
  if (!overlayOn && !previewOnly) {
    unbindEscStop()
    return
  }
  clearPreviewTimer()
  previewOnly = false
  controllingRunId = undefined
  overlayOn = false
  unbindEscStop()
  sendOverlayChrome({ visible: false })
}

/** 退出时只清状态，避免与 disposeOverlayWindow 互调。 */
export function resetDesktopOverlayChrome(): void {
  clearPreviewTimer()
  previewOnly = false
  controllingRunId = undefined
  overlayOn = false
  unbindEscStop()
}

/**
 * 一键停 / Esc：先熄铬，再中止在跑的 Enjoy 循环。
 * 执行器中途的 click 可能仍会落下（kai 薄挂点）。
 */
export async function stopDesktopActOverlay(): Promise<void> {
  const runId = controllingRunId
  const wasPreview = previewOnly
  endDesktopActOverlay()
  if (wasPreview) return
  const { abortAgent } = await import("../agent-runner")
  if (runId) {
    await abortAgent({ runId })
    return
  }
  const targets = listActiveRuns()
  const pumping = targets.filter((item) => item.run.pumping)
  for (const item of pumping.length ? pumping : targets) {
    await abortAgent({ runId: item.runId })
  }
}

/** 设置页预览冷静铬，约一个呼吸周期后熄；不是成功 toast。 */
export function previewScreenOverlay(): void {
  const state = getBuiltinToolsState()
  if (!state.computerUse.enabled || !state.computerUse.screenVisuals) return
  clearPreviewTimer()
  previewOnly = true
  controllingRunId = undefined
  paintOverlay(overlayLocale() === "en" ? "Calculator" : "计算器")
  previewTimer = setTimeout(() => {
    previewTimer = null
    if (previewOnly) endDesktopActOverlay()
  }, 2400)
}
