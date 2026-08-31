/**
 * 读取资产库并把附件编进最后一条用户消息。
 */
import type { ModelMessage, UserContent } from "ai"
import { resolveMediaType } from "@enjoy-agents/assets"
import { effectiveCapabilities } from "@enjoy-agents/providers"
import { encodeAttachmentParts, type AttachmentCaps } from "./attach-parts"
import { readAssetBytes } from "./asset-service"

export type AttachedAssetMeta = {
  assetId: string
  mediaType: string
  name: string
}

export async function appendRunAttachments(
  messages: ModelMessage[],
  assetIds: string[],
  caps: AttachmentCaps
): Promise<AttachedAssetMeta[]> {
  if (assetIds.length === 0) return []
  const last = messages.at(-1)
  if (!last || last.role !== "user") return []

  const assets = await Promise.all(
    assetIds.map(async (assetId) => {
      const asset = await readAssetBytes(assetId)
      return {
        assetId,
        name: asset.name,
        mediaType: asset.mediaType,
        bytes: Uint8Array.from(Buffer.from(asset.bytesBase64, "base64"))
      }
    })
  )
  const encoded = encodeAttachmentParts(assets, caps)
  const prompt = typeof last.content === "string" ? last.content : ""
  const content: UserContent = [
    { type: "text" as const, text: prompt },
    ...encoded.map((part) =>
      part.kind === "text"
        ? { type: "text" as const, text: part.text }
        : {
            type: "file" as const,
            mediaType: part.mediaType,
            filename: part.filename,
            data: part.data
          }
    )
  ]
  messages[messages.length - 1] = { role: "user", content }
  return assets.map((asset) => ({
    assetId: asset.assetId,
    mediaType: resolveMediaType(asset.name, asset.mediaType),
    name: asset.name
  }))
}

export function attachmentCapsFor(modelId: string | undefined, kind: string | undefined): AttachmentCaps {
  const caps = effectiveCapabilities(modelId ?? "", kind ?? "")
  return {
    vision: caps.includes("vision"),
    files: caps.includes("files")
  }
}
