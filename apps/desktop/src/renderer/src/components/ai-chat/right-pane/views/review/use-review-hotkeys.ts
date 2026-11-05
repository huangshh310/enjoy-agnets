/**
 * 审查栏在前台时响应登记命令 review.file.next / prev。
 * 不再自比 j/k；和弦走 useKeybindingDispatcher + 设置可改表。
 * when=!inputFocus 由解析表保证；未挂载 / 未启用时返回 false 不吞键。
 */

import { useRef } from "react"
import type { ChangedFileRow } from "@renderer/stores/chat-store"
import { useKeybindingCommand } from "@renderer/components/settings/keybindings/keybinding-handlers"

export function useReviewHotkeys(opts: {
  enabled: boolean
  changes: ChangedFileRow[]
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
}) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useKeybindingCommand("review.file.next", () => selectRelative(optsRef.current, 1))
  useKeybindingCommand("review.file.prev", () => selectRelative(optsRef.current, -1))
}

function selectRelative(
  cur: {
    enabled: boolean
    changes: ChangedFileRow[]
    selectedFilePath: string | null
    onSelectFile: (path: string) => void
  },
  delta: 1 | -1
): boolean {
  if (!cur.enabled) return false
  if (cur.changes.length === 0) return false
  const idx = Math.max(
    0,
    cur.changes.findIndex((file) => file.path === cur.selectedFilePath)
  )
  const next = idx + delta
  const bounded = Math.min(cur.changes.length - 1, Math.max(0, next))
  const path = cur.changes[bounded]?.path
  if (!path) return false
  cur.onSelectFile(path)
  return true
}
