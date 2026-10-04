/**
 * 审查树暂存目标：文件原样；目录只收当前树上该前缀下、符合动作的叶子。
 * 过滤后的树不含被搜掉的文件，因此目录动作不会碰到未列出的路径。
 */
import type { FileTreeNode } from "../types/review.types"

export function listedStagePaths(
  nodes: FileTreeNode[],
  path: string,
  action: "add" | "unstage"
): string[] {
  const node = findNode(nodes, path)
  if (!node) return []
  if (!node.isDir) return [node.path]
  return walkLeaves(node)
    .filter((leaf) => leafMatches(leaf, action))
    .map((leaf) => leaf.path)
}

/** 暂存收工作区还有改动的叶子，含索引和工作区都脏的 MM。取消暂存只收已进索引的。 */
function leafMatches(leaf: FileTreeNode, action: "add" | "unstage"): boolean {
  if (action === "unstage") return leaf.staged === true
  return leaf.worktree === true && leaf.status !== undefined
}

function walkLeaves(node: FileTreeNode): FileTreeNode[] {
  if (!node.isDir) return [node]
  return (node.children ?? []).flatMap(walkLeaves)
}

function findNode(nodes: FileTreeNode[], path: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.isDir && node.children) {
      const found = findNode(node.children, path)
      if (found) return found
    }
  }
  return null
}
