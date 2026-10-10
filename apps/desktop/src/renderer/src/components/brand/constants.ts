/**
 * enjoy-ui-kit 公开路径与光学阈值。界面标只走这些 URL，不要内联 SVG。
 */

/** 相对当前页解析，避免 file:// 下 `/enjoy-ui-kit` 指到盘根、向导重开裂图。 */
export function kitSvgUrl(file: string): string {
  try {
    return new URL(`enjoy-ui-kit/svg/${file}`, document.baseURI).href
  } catch {
    return `/enjoy-ui-kit/svg/${file}`
  }
}

export const KIT_SVG = "/enjoy-ui-kit/svg"

/** USAGE：≤32px 必须用加粗光学版，禁止直接缩小 1024。 */
export const SMALL_MARK_MAX_PX = 32

export const MARK_SMALL = "icon-small.svg"
export const MARK_LIGHT = "icon-light.svg"
export const MARK_DARK = "icon-dark.svg"

export const WORDMARK = "enjoy"
export const WORDMARK_SUB = "AGENT IDE"
