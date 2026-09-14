/**
 * 快捷键：对齐 infinite-canvas project.tsx handleKeyDown。
 */
import { useEffect } from "react"
import type { useCanvasEditor } from "./use-canvas-editor"

export function useCanvasKeyboard({ editor }: { editor: ReturnType<typeof useCanvasEditor> }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        target?.closest("[contenteditable='true'],[data-canvas-no-zoom]")
      ) {
        return
      }
      const key = event.key.toLowerCase()
      const meta = event.metaKey || event.ctrlKey
      if (meta && key === "z") {
        event.preventDefault()
        if (event.shiftKey) editor.redoCanvas()
        else editor.undoCanvas()
        return
      }
      if (meta && key === "y") {
        event.preventDefault()
        editor.redoCanvas()
        return
      }
      if (meta && key === "a") {
        event.preventDefault()
        editor.setSelectedNodeIds(new Set(editor.nodesRef.current.map((node) => node.id)))
        return
      }
      if (meta && key === "g") {
        event.preventDefault()
        if (event.shiftKey) editor.ungroupSelection()
        else editor.groupSelection()
        return
      }
      if (meta && key === "c") {
        event.preventDefault()
        editor.copySelected()
        return
      }
      if (meta && key === "v") {
        event.preventDefault()
        editor.pasteCopied()
        return
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (editor.selectedNodeIdsRef.current.size) editor.deleteNodes(new Set(editor.selectedNodeIdsRef.current))
        else if (editor.selectedConnectionId) {
          editor.setConnections((prev) => prev.filter((item) => item.id !== editor.selectedConnectionId))
        }
      }
      if (event.key === "Escape") {
        editor.setSelectedNodeIds(new Set())
        editor.setSelectedConnectionId(null)
        editor.setContextMenu(null)
        editor.setNodeCreatePosition(null)
        editor.setConnectingParams(null)
        editor.setDialogNodeId(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editor])
}
