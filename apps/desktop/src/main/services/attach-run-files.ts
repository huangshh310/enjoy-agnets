/**
 * 读取资产库并把附件编进最后一条用户消息。
 */
import type { ModelMessage, UserContent } from "ai"
import { resolveMediaType } from "@enjoy-agents/assets"
import { effectiveCapabilities } from "@enjoy-agents/providers"
import { encodeAttachmentParts, type AttachmentCaps } from "./attach-parts"
import { readAssetBytes } from "./asset-service"
import { ATTACHMENT_ONLY_USER_TEXT } from "./to-model-messages"
import { isE2eStub } from "./e2e-stub-gate"

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
  const raw = typeof last.content === "string" ? last.content : ""
  // 只图轮：占位 / 空正文不发空 text part（leo MUST 1）。
  const prompt = raw === ATTACHMENT_ONLY_USER_TEXT ? "" : raw
  const content: UserContent = [
    ...(prompt.trim() ? [{ type: "text" as const, text: prompt }] : []),
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
  // 编不出任何 part（极端：附件全被能力过滤）时保留原句，不发空 content。
  messages[messages.length - 1] = content.length > 0 ? { role: "user", content } : last
  return assets.map((asset) => ({
    assetId: asset.assetId,
    mediaType: resolveMediaType(asset.name, asset.mediaType),
    name: asset.name
  }))
}

export function attachmentCapsFor(modelId: string | undefined, kind: string | undefined): AttachmentCaps {
  const caps = effectiveCapabilities(modelId ?? "", kind ?? "")
  return {
    // e2e 只图发送：stub 模型按需当作能看图（仅 stub 闸开：未打包 + 隔离 userData）。
    vision: caps.includes("vision") || (process.env.ENJOY_E2E_STUB_VISION === "1" && isE2eStub()),
    files: caps.includes("files")
  }
}
