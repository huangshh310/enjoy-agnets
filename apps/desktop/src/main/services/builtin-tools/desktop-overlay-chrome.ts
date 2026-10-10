/**
 * CU-P0-C overlay 生命周期：act 开始亮、结束/取消/失败/停熄。
 * 不发空成功条。Esc / 一键停走同一条 abort。
 */
import { app } from "electron"
import { desktopOverlayOnce } from "./desktop-overlay-once"
import { bindOverlayEscape, unbindOverlayEscape } from "./desktop-overlay-esc"
import { currentToolRunId } from "../active-run-id"
import { currentPumpingRunId, listActiveRuns } from "../agent-run-state"
import { readPreferences } from "../preferences"
import { getBuiltinToolsState } from "./builtin-tools-state"
import { overlayChromeCopy, shouldShowDesktopOverlay } from "./desktop-overlay-visibility"
import {
  resolveDesktopActRunId,
  runDesktopOverlayStop
} from "./desktop-overlay-lifecycle"
import { sendOverlayChrome } from "./screen-overlay-service"

let overlayOn = false
let previewTimer: ReturnType<typeof setTimeout> | null = null
let previewOnly = false
let controllingRunId: string | undefined

const CUSTOM_POINTER = "rgba(196, 163, 90, 0.72)"

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

function paintOverlay(appName: string): void {
  const custom = readPreferences().computerUsePointer === "custom"
  sendOverlayChrome({
    visible: true,
    ...overlayChromeCopy(overlayLocale(), appName),
    ...(custom ? { pointerColor: CUSTOM_POINTER } : {})
  })
  overlayOn = true
  bindOverlayEscape(() => {
    void stopDesktopActOverlay()
  })
}

/** 已批目标开始 click/type/key/… 时点亮。wait / 关开关不亮。 */
export function beginDesktopActOverlay(input: { action: string; appName?: string; runId?: string }): void {
  const state = getBuiltinToolsState()
  if (
    !shouldShowDesktopOverlay({
      action: input.action,
      enabled: state.computerUse.enabled,
      screenVisuals: state.computerUse.screenVisuals,
      once: desktopOverlayOnce()
    })
  ) {
    return
  }
  clearPreviewTimer()
  previewOnly = false
  controllingRunId = resolveDesktopActRunId(input.runId, currentToolRunId(), currentPumpingRunId())
  paintOverlay(input.appName ?? "")
}

/** 结束 / 失败 / 二次确认停卡：立刻熄，不画成功条。 */
export function endDesktopActOverlay(): void {
  if (!overlayOn && !previewOnly) {
    unbindOverlayEscape()
    return
  }
  clearPreviewTimer()
  previewOnly = false
  controllingRunId = undefined
  overlayOn = false
  unbindOverlayEscape()
  sendOverlayChrome({ visible: false })
}

/** 退出时只清状态，避免与 disposeOverlayWindow 互调。 */
export function resetDesktopOverlayChrome(): void {
  clearPreviewTimer()
  previewOnly = false
  controllingRunId = undefined
  overlayOn = false
  unbindOverlayEscape()
}

/**
 * 一键停 / Esc：先熄铬，再硬取消在途 act，再 abort 该 runId。
 * 协议没有 cancel RPC；OS 已落下的 click 无法撤回。
 */
export async function stopDesktopActOverlay(): Promise<void> {
  const runId = controllingRunId
  const wasPreview = previewOnly
  const { abortAgent } = await import("../agent-runner")
  const { cancelInFlightDesktopAct } = await import("./computer-use/desktop-tools")
  await runDesktopOverlayStop({
    controllingRunId: runId,
    previewOnly: wasPreview,
    runs: listActiveRuns().map((item) => ({ runId: item.runId, pumping: item.run.pumping })),
    endOverlay: endDesktopActOverlay,
    cancelInFlight: () => cancelInFlightDesktopAct({ runId }),
    abortAgent: (id) => abortAgent({ runId: id })
  })
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
