/**
 * 审查栏在前台时才听 j/k。不截 Ctrl+P（那是打开 Files），不截 Ctrl+Enter（输入框自己处理）。
 */

import { useEffect, useRef } from "react"
import type { ChangedFileRow } from "@renderer/stores/chat-store"

export function useReviewHotkeys(opts: {
  enabled: boolean
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
}) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (!opts.enabled) return
    function onKey(event: KeyboardEvent) {
      const cur = optsRef.current
      if (!cur.enabled) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (event.key !== "j" && event.key !== "k") return
      if (cur.changes.length === 0) return
      const idx = Math.max(
        0,
        cur.changes.findIndex((file) => file.path === cur.selectedFilePath)
      )
      const next = event.key === "j" ? idx + 1 : idx - 1
      const bounded = Math.min(cur.changes.length - 1, Math.max(0, next))
      const path = cur.changes[bounded]?.path
      if (path) cur.onSelectFile(path)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [opts.enabled])
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}
