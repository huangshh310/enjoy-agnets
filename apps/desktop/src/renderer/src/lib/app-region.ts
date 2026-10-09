/**
 * 无边框窗口可点控件必须标 no-drag，否则会落进标题栏拖拽区。
 */
import type { CSSProperties } from "react"

export const APP_REGION_NO_DRAG_CLASS = "[app-region:no-drag]"

export const APP_REGION_NO_DRAG_STYLE = {
  WebkitAppRegion: "no-drag"
} as CSSProperties

export function appRegionNoDragProps() {
  return {
    className: APP_REGION_NO_DRAG_CLASS,
    style: APP_REGION_NO_DRAG_STYLE,
    "data-app-region": "no-drag" as const
  }
}
