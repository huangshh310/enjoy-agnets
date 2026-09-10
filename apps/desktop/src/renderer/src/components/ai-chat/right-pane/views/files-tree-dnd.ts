/**
 * Files 树拖拽：能否放到某行 / 根。不碰 IPC。
 */
import { dropTargetDir, planWorkspaceMove } from "@enjoy-agents/ipc-contract"
import type { DirEntry } from "./files-entries"

export type FilesDragPayload = { path: string; kind: "file" | "directory" }

export function toDirForEntry(target: DirEntry): string {
  return dropTargetDir(target.path, target.kind)
}

export function canDropOnEntry(dragging: FilesDragPayload, target: DirEntry): boolean {
  if (dragging.path === target.path) return false
  try {
    planWorkspaceMove(dragging.path, toDirForEntry(target))
    return true
  } catch {
    return false
  }
}

export function canDropOnRoot(dragging: FilesDragPayload): boolean {
  try {
    planWorkspaceMove(dragging.path, ".")
    return true
  } catch {
    return false
  }
}
