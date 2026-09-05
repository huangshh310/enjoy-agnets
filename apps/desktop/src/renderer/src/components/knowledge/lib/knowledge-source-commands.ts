/**
 * 知识来源添加 / 重建。UI 只负责调用与刷新。
 */
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { getIde } from "@renderer/lib/ide"
import { isSameKnowledgeSourcePath } from "../knowledge-edit-path"

export async function addAndIndexSource(workspaceId: string, targetPath: string): Promise<string> {
  const created = (await getIde().knowledge.addSource({
    workspaceId,
    path: targetPath
  })) as KnowledgeSource
  await getIde().knowledge.index({ sourceId: created.id, rebuild: true })
  return created.id
}

export async function rebuildSourceIndex(sourceId: string): Promise<void> {
  await getIde().knowledge.index({ sourceId, rebuild: true })
}

export async function saveSourcePathAndReindex(input: {
  workspaceId: string
  oldSourceId: string
  newPath: string
  currentPath?: string
}): Promise<string> {
  const samePath = input.currentPath
    ? isSameKnowledgeSourcePath(input.newPath, input.currentPath)
    : false
  if (samePath) {
    await getIde().knowledge.index({ sourceId: input.oldSourceId, rebuild: true })
    return input.oldSourceId
  }
  await getIde().knowledge.remove(input.oldSourceId)
  const created = (await getIde().knowledge.addSource({
    workspaceId: input.workspaceId,
    path: input.newPath.trim()
  })) as KnowledgeSource
  await getIde().knowledge.index({ sourceId: created.id, rebuild: true })
  return created.id
}
