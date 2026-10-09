/**
 * 内容区横向位移：后退向右，前进向左。
 * 播不播已经在切栈时写进 slide，这里不再读 running。
 */
import { useEffect, useRef, type ReactNode } from "react"
import { useNavHistoryStore } from "@renderer/hooks/nav-history/nav-history-store"
import "./history-page-slide.css"

export function HistoryPageSlide({ children }: { children: ReactNode }) {
  const token = useNavHistoryStore((state) => state.slideToken)
  const node = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = node.current
    const slide = useNavHistoryStore.getState().slide
    if (!element || token === 0) return
    element.classList.remove("nav-history-back", "nav-history-forward")
    if (!slide) return
    void element.offsetWidth
    element.classList.add(slide === "back" ? "nav-history-back" : "nav-history-forward")
  }, [token])

  return (
    <div ref={node} className="h-full min-h-0 min-w-0">
      {children}
    </div>
  )
}
