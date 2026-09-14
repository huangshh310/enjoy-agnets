/**
 * 画布撤销栈，对齐 infinite-canvas historyRef。
 */
import { useCallback, useRef, useState } from "react"
import { HISTORY_LIMIT } from "../lib/canvas-constants"
import type { CanvasConnection, CanvasNodeData } from "../lib/canvas.types"

export type CanvasHistoryEntry = {
  nodes: CanvasNodeData[]
  connections: CanvasConnection[]
}

export function useCanvasHistory() {
  const pastRef = useRef<CanvasHistoryEntry[]>([])
  const futureRef = useRef<CanvasHistoryEntry[]>([])
  const pausedRef = useRef(false)
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false })

  const sync = useCallback(() => {
    setFlags({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 })
  }, [])

  const push = useCallback(
    (entry: CanvasHistoryEntry) => {
      if (pausedRef.current) return
      pastRef.current = [entry, ...pastRef.current].slice(0, HISTORY_LIMIT)
      futureRef.current = []
      sync()
    },
    [sync]
  )

  const undo = useCallback(
    (current: CanvasHistoryEntry): CanvasHistoryEntry | null => {
      const prev = pastRef.current[0]
      if (!prev) return null
      pastRef.current = pastRef.current.slice(1)
      futureRef.current = [current, ...futureRef.current].slice(0, HISTORY_LIMIT)
      sync()
      return prev
    },
    [sync]
  )

  const redo = useCallback(
    (current: CanvasHistoryEntry): CanvasHistoryEntry | null => {
      const next = futureRef.current[0]
      if (!next) return null
      futureRef.current = futureRef.current.slice(1)
      pastRef.current = [current, ...pastRef.current].slice(0, HISTORY_LIMIT)
      sync()
      return next
    },
    [sync]
  )

  const reset = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    sync()
  }, [sync])

  return { ...flags, push, undo, redo, reset, pausedRef }
}
