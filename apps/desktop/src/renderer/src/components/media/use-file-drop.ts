/**
 * 页面级拖拽导入：进入区域高亮，离开子节点不取消。
 */
import { useState, type DragEvent } from "react"

export function useFileDrop(onFiles: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false)

  function onDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragOver(true)
  }

  function onDragLeave(event: DragEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
    setIsDragOver(false)
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragOver(false)
    const files = [...event.dataTransfer.files]
    if (files.length > 0) onFiles(files)
  }

  return { isDragOver, dropHandlers: { onDragOver, onDragLeave, onDrop } }
}
