/**
 * `/computer-use` 这一发允许在总开关关闭时点亮 overlay。
 * 泵开始时记下，泵结束时清掉。不写偏好。
 */
let once = false

export function setDesktopOverlayOnce(active: boolean): void {
  once = active
}

export function desktopOverlayOnce(): boolean {
  return once
}
