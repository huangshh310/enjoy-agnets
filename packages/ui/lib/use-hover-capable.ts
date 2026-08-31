/**
 * 仅在真·鼠标悬停设备上为 true，避免触摸点按粘住 :hover。
 */
import { useEffect, useState } from "react"

export function useHoverCapable() {
  const [canHover, setCanHover] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const media = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setCanHover(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return canHover
}
