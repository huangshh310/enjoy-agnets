/**
 * 把本地文件导入为画布媒体节点。
 */
import { resolveMediaType } from "@enjoy-agents/assets/media-type"
import { fileToBase64 } from "@renderer/lib/file-bytes"
import { getIde, hasIde } from "@renderer/lib/ide"
import { createCanvasNode, fitNodeSize } from "./canvas-node-factory"
import { CanvasNodeType, type CanvasNodeData, type Position } from "./canvas.types"

export async function importCanvasFiles(files: File[], center: Position): Promise<CanvasNodeData[]> {
  if (!hasIde()) return []
  const created: CanvasNodeData[] = []
  for (const file of files) {
    const mediaType = resolveMediaType(file.name, file.type)
    const asset = (await getIde().assets.import({
      name: file.name,
      mediaType,
      bytesBase64: await fileToBase64(file)
    })) as { id: string; mediaType: string }
    const kind = mediaType.startsWith("video")
      ? CanvasNodeType.Video
      : mediaType.startsWith("audio")
        ? CanvasNodeType.Audio
        : CanvasNodeType.Image
    const node = createCanvasNode(kind, center, { status: "success", storageKey: asset.id, mimeType: asset.mediaType }, file.name)
    if (kind === CanvasNodeType.Video) {
      const { assetPlaybackUrl } = await import("@enjoy-agents/assets/playback-url")
      node.metadata = { ...node.metadata, content: assetPlaybackUrl(asset.id) }
    } else if (kind === CanvasNodeType.Image) {
      const row = (await getIde().assets.read(asset.id)) as { bytesBase64?: string; mediaType?: string }
      if (row.bytesBase64) node.metadata = { ...node.metadata, content: `data:${row.mediaType};base64,${row.bytesBase64}` }
    }
    const fitted = fitNodeSize(node.width, node.height)
    node.width = fitted.width
    node.height = fitted.height
    created.push(node)
  }
  return created
}
