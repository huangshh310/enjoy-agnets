/**
 * 薄适配：把 buildFileTree 产出的 FileTreeNode[] 喂给 @headless-tree 的 sync dataLoader。
 * 不改过滤 / 暂存语义。
 */
import type { FileTreeNode } from "../types/review.types"

export const HEADLESS_ROOT_ID = "root"

export type HeadlessTreeIndex = {
  byId: Map<string, FileTreeNode>
  roots: FileTreeNode[]
}

export function indexFileTree(roots: FileTreeNode[]): HeadlessTreeIndex {
  const byId = new Map<string, FileTreeNode>()
  const walk = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      byId.set(node.id, node)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(roots)
  return { byId, roots }
}

/** 所有目录 id（现网 defaultExpanded=true，首屏全部展开） */
export function collectFolderIds(roots: FileTreeNode[]): string[] {
  const ids: string[] = []
  const walk = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      if (!node.isDir) continue
      ids.push(node.id)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(roots)
  return ids
}

/** 选中文件的祖先目录 id，保证高亮行可见 */
export function ancestorFolderIds(filePath: string | null): string[] {
  if (!filePath) return []
  const parts = filePath.split("/").filter(Boolean)
  if (parts.length <= 1) return []
  const ids: string[] = []
  for (let i = 0; i < parts.length - 1; i++) {
    ids.push(parts.slice(0, i + 1).join("/"))
  }
  return ids
}

export function mergeExpandedIds(
  current: string[],
  extra: string[]
): string[] {
  if (extra.length === 0) return current
  const set = new Set(current)
  for (const id of extra) set.add(id)
  return Array.from(set)
}
