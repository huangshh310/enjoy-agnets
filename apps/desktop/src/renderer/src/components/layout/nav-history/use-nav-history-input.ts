/**
 * 快捷键和鼠标侧键绑在窗口上，不绑在按钮上。
 * macOS 是 ⌘[ / ⌘]，Windows / Linux 是 Alt+左右。
 * 侧键在 mouseup 上走应用内栈。mousedown 只拦住原生 history.back()。
 */
import { useEffect } from "react"
import { isMacWindowChrome } from "../window-chrome"
import { travelHistory } from "@renderer/hooks/nav-history/nav-history-controller"
import { isTypingTarget } from "./typing-target"

export function useNavHistoryInput(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return
      const direction = directionFromKey(event)
      if (!direction) return
      event.preventDefault()
      void travelHistory(direction)
    }
    const onMouseDown = (event: MouseEvent) => {
      if (!directionFromMouse(event.button)) return
      event.preventDefault()
      event.stopPropagation()
    }
    const onMouseUp = (event: MouseEvent) => {
      const direction = directionFromMouse(event.button)
      if (!direction) return
      event.preventDefault()
      event.stopPropagation()
      void travelHistory(direction)
    }
    const onAuxClick = (event: MouseEvent) => {
      if (!directionFromMouse(event.button)) return
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onMouseDown, true)
    window.addEventListener("mouseup", onMouseUp, true)
    window.addEventListener("auxclick", onAuxClick, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onMouseDown, true)
      window.removeEventListener("mouseup", onMouseUp, true)
      window.removeEventListener("auxclick", onAuxClick, true)
    }
  }, [])
}

function directionFromKey(event: KeyboardEvent): "back" | "forward" | null {
  if (event.shiftKey) return null
  if (isMacWindowChrome()) {
    if (!event.metaKey || event.ctrlKey || event.altKey) return null
    if (event.code === "BracketLeft") return "back"
    if (event.code === "BracketRight") return "forward"
    return null
  }
  if (!event.altKey || event.metaKey || event.ctrlKey) return null
  if (event.code === "ArrowLeft") return "back"
  if (event.code === "ArrowRight") return "forward"
  return null
}

function directionFromMouse(button: number): "back" | "forward" | null {
  if (button === 3) return "back"
  if (button === 4) return "forward"
  return null
}
