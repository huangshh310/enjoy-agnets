/**
 * 导出到工作区必须显式审批，并校验路径不逃逸。
 */
import { relative } from "node:path"
import { assertInsideRoot } from "@enjoy-agents/db/path-safe"

export function previewExport(rootPath: string, relativePath: string, exists: boolean) {
  const targetPath = assertInsideRoot(rootPath, relativePath)
  return {
    targetPath,
    exists,
    overwriteRisk: exists
  }
}

/** 系统保存框选中的绝对路径仍必须落在工作区根内。 */
export function resolvePickedExportPath(rootPath: string, pickedPath: string): string {
  return assertInsideRoot(rootPath, relative(rootPath, pickedPath))
}

export function kindFromMediaType(mediaType: string): "image" | "audio" | "video" | "pdf" | "file" {
  if (mediaType.startsWith("image/")) return "image"
  if (mediaType.startsWith("audio/")) return "audio"
  if (mediaType.startsWith("video/")) return "video"
  if (mediaType === "application/pdf") return "pdf"
  return "file"
}
