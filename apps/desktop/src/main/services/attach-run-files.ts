/**
 * 把资产库附件编进最后一条用户消息，供多模态模型读取。
 */
import type { ModelMessage } from "ai"
import { readAssetBytes } from "./asset-service"

export async function appendRunAttachments(messages: ModelMessage[], assetIds: string[]) {
  if (assetIds.length === 0) return
  const last = messages.at(-1)
  if (!last || last.role !== "user") return
  const files = await Promise.all(assetIds.map((id) => filePartFromAsset(id)))
  const text = typeof last.content === "string" ? last.content : ""
  messages[messages.length - 1] = {
    role: "user",
    content: [{ type: "text" as const, text }, ...files]
  }
}

async function filePartFromAsset(id: string) {
  const asset = await readAssetBytes(id)
  return {
    type: "file" as const,
    mediaType: asset.mediaType,
    filename: asset.name,
    data: Buffer.from(asset.bytesBase64, "base64")
  }
}
