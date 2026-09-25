/**
 * CU-P0-C overlay 可见性与文案：只在已批 desktop_act（非 wait）进行中才亮。
 * 探索态不会走到这里；无观察 / 未在 act 禁止假装「正在控制」。
 */

export const OVERLAY_ACT_ACTIONS = ["click", "move", "drag", "scroll", "type", "key"] as const

export type OverlayChromeCopy = {
  title: string
  stopLabel: string
  escHint: string
  lang: "zh-CN" | "en"
}

/** wait 不亮边；click/type/key/move/drag/scroll 才算在控。 */
export function isDesktopActOverlayAction(action: string): boolean {
  return (OVERLAY_ACT_ACTIONS as readonly string[]).includes(action)
}

/** 设置关、视觉关、或非在控动作 → 不 ensure overlay。 */
export function shouldShowDesktopOverlay(input: {
  action: string
  enabled: boolean
  screenVisuals: boolean
}): boolean {
  return input.enabled && input.screenVisuals && isDesktopActOverlayAction(input.action)
}

/** 与 renderer `chat.overlay*` 同句，供独立 overlay 窗使用。 */
export function overlayChromeCopy(locale: "zh" | "en", appName: string): OverlayChromeCopy {
  const app = appName.trim() || (locale === "en" ? "Desktop" : "桌面")
  if (locale === "en") {
    return {
      title: `Controlling · ${app}`,
      stopLabel: "Stop",
      escHint: "Esc to stop",
      lang: "en"
    }
  }
  return {
    title: `正在操控 · ${app}`,
    stopLabel: "停止",
    escHint: "Esc 停一手势",
    lang: "zh-CN"
  }
}
