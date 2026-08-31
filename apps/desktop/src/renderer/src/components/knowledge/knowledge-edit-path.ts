/**
 * 编辑来源路径：空路径不能存；路径没变也要能 Rebuild。
 */
export function canSaveKnowledgeSourcePath(path: string, isSaving: boolean): boolean {
  return Boolean(path.trim()) && !isSaving
}

export function isSameKnowledgeSourcePath(nextPath: string, currentPath: string): boolean {
  return nextPath.trim().replace(/\\/g, "/") === currentPath.trim().replace(/\\/g, "/")
}
