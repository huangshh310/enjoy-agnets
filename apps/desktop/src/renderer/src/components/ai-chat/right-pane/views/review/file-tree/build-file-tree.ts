/**
 * 文件树纯函数构造器：
 * 将扁平的 ChangedFileRow[] 按照路径分隔符 "/" 解析为具备目录折叠能力的树状数据结构。
 */

import type { ChangedFileRow } from "@renderer/stores/chat-store"
import type { FileTreeNode } from "../types/review.types"

/**
 * 将变更文件列表转为层级文件树，并支持搜索关键字过滤
 * @param files 变更文件扁平数组
 * @param query 过滤搜索词
 * @returns 顶级树节点数组
 */
export function buildFileTree(
  files: ChangedFileRow[],
  query = ""
): FileTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase()
  const filteredFiles = normalizedQuery
    ? files.filter((f) => f.path.toLowerCase().includes(normalizedQuery))
    : files

  const root: FileTreeNode = {
    id: "root",
    name: "",
    path: "",
    isDir: true,
    children: []
  }

  for (const file of filteredFiles) {
    const parts = file.path.split("/").filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLeaf = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join("/")

      if (!current.children) {
        current.children = []
      }

      let existing = current.children.find((child) => child.name === part)

      if (!existing) {
        existing = {
          id: currentPath,
          name: part,
          path: currentPath,
          isDir: !isLeaf,
          children: isLeaf ? undefined : [],
          status: isLeaf ? file.status : undefined,
          staged: isLeaf ? file.staged : undefined,
          worktree: isLeaf ? file.worktree : undefined,
          additions: isLeaf ? file.additions : undefined,
          deletions: isLeaf ? file.deletions : undefined
        }
        current.children.push(existing)
      } else if (isLeaf) {
        existing.status = file.status
        existing.staged = file.staged
        existing.worktree = file.worktree
        existing.additions = file.additions
        existing.deletions = file.deletions
      }

      current = existing
    }
  }

  sortTreeNodes(root.children || [])
  return root.children || []
}

/** 目录排在前面，同级按名称字母顺序升序排列 */
function sortTreeNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    return a.name.localeCompare(b.name)
  })

  for (const node of nodes) {
    if (node.isDir && node.children) {
      sortTreeNodes(node.children)
    }
  }
}
