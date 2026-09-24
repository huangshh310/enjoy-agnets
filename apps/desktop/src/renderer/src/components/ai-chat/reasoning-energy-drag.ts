/**
 * 思考能量条：指针位置吸附到最近档。拖动中只在档位变化时提交。
 */
import { EFFORT_LEVELS } from "./reasoning-effort-config"

/** 拖动期间拦住弹出层的「点外面」，否则滑块一按菜单就关。 */
export function markEnergyDrag(active: boolean): void {
  if (active) document.documentElement.dataset.energyDrag = "1"
  else delete document.documentElement.dataset.energyDrag
}

export function blockDismissWhileEnergyDrag(event: { preventDefault: () => void }): void {
  if (document.documentElement.dataset.energyDrag === "1") event.preventDefault()
}

export function pointerRatio(clientX: number, rect: DOMRect): number {
  if (rect.width <= 0) return 0
  return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
}

export function effortIndexAt(clientX: number, rect: DOMRect, count = EFFORT_LEVELS.length): number {
  if (count <= 1) return 0
  return Math.round(pointerRatio(clientX, rect) * (count - 1))
}
