/**
 * 审查栏快捷键：Ctrl/⌘P 跳文件，j/k 下一/上一文件，Ctrl/⌘Enter 聚焦提交框。
 * 输入框内不抢 j/k。
 */

import { useEffect } from "react"
import type { ChangedFileRow } from "@renderer/stores/chat-store"

export function useReviewHotkeys(opts: {
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  onOpenJump: () => void
  onPrimaryAction: () => void
}) {
  const { changes, selectedFilePath, onSelectFile, onOpenJump, onPrimaryAction } = opts

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === "p") {
        event.preventDefault()
        onOpenJump()
        return
      }
      if (meta && event.key === "Enter") {
        event.preventDefault()
        onPrimaryAction()
        return
      }
      if (isTypingTarget(event.target)) return
      if (event.key !== "j" && event.key !== "k") return
      if (changes.length === 0) return
      const idx = Math.max(
        0,
        changes.findIndex((file) => file.path === selectedFilePath)
      )
      const next = event.key === "j" ? idx + 1 : idx - 1
      const bounded = Math.min(changes.length - 1, Math.max(0, next))
      const path = changes[bounded]?.path
      if (path) onSelectFile(path)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [changes, selectedFilePath, onSelectFile, onOpenJump, onPrimaryAction])
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}
