/**
 * 媒体库操作：生成走 ai.generate，导出回报覆盖风险。
 */
import { getIde } from "../lib/ide"

export async function generateLibraryMedia(input: {
  kind: "image" | "speech" | "video" | "transcription" | "translation"
  sessionId: string
  modelId: string
  prompt: string
  attachments?: string[]
}) {
  return getIde().ai.generate({
    kind: input.kind,
    sessionId: input.sessionId,
    modelId: input.modelId,
    prompt: input.prompt,
    attachments: input.attachments ?? []
  })
}

export async function exportLibraryAsset(input: {
  id: string
  workspaceId: string
  relativePath: string
  overwrite: boolean
}) {
  return getIde().assets.export(input) as Promise<{
    exported?: boolean
    overwriteRisk?: boolean
    targetPath?: string
  }>
}
