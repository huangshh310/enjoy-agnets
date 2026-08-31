/**
 * 把资产编成用户消息 parts：文本内联，图片/PDF 才走多模态 file。
 */
import {
  isImageMediaType,
  isPdfMediaType,
  isTextLikeMediaType,
  resolveMediaType
} from "../../../../../packages/assets/src/media-type.ts"

export type AttachmentCaps = {
  vision: boolean
  files: boolean
}

export type AttachmentInput = {
  name: string
  mediaType: string
  bytes: Uint8Array
}

export type EncodedUserPart =
  | { kind: "text"; text: string }
  | { kind: "file"; mediaType: string; filename: string; data: Uint8Array }

const MAX_INLINE_CHARS = 200_000

export function encodeAttachmentParts(
  assets: AttachmentInput[],
  caps: AttachmentCaps
): EncodedUserPart[] {
  return assets.map((asset) => encodeOne(asset, caps))
}

function encodeOne(asset: AttachmentInput, caps: AttachmentCaps): EncodedUserPart {
  const mediaType = resolveMediaType(asset.name, asset.mediaType)
  if (isTextLikeMediaType(mediaType) || looksLikeUtf8Text(mediaType, asset.bytes)) {
    return { kind: "text", text: textPartBody(asset.name, asset.bytes) }
  }
  if (isImageMediaType(mediaType)) {
    if (!caps.vision) {
      throw new Error(`${asset.name} needs a vision-capable model.`)
    }
    return { kind: "file", mediaType, filename: asset.name, data: asset.bytes }
  }
  if (isPdfMediaType(mediaType) || mediaType === "application/octet-stream") {
    if (!caps.files) {
      throw new Error(
        mediaType === "application/octet-stream"
          ? `${asset.name} is binary. Use a model with Files, or attach text / images.`
          : `${asset.name} needs a model with Files.`
      )
    }
    return { kind: "file", mediaType, filename: asset.name, data: asset.bytes }
  }
  if (!caps.files) {
    throw new Error(`${asset.name} (${mediaType}) needs a model with Files.`)
  }
  return { kind: "file", mediaType, filename: asset.name, data: asset.bytes }
}

function textPartBody(name: string, bytes: Uint8Array): string {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  const clipped =
    decoded.length > MAX_INLINE_CHARS
      ? `${decoded.slice(0, MAX_INLINE_CHARS)}\n\n[truncated after ${MAX_INLINE_CHARS} characters]`
      : decoded
  return `Attached file: ${name}\n\n${clipped}`
}

/** 扩展名未知但内容是可打印 UTF-8 时，仍当文本，避免再当 octet-stream。 */
function looksLikeUtf8Text(mediaType: string, bytes: Uint8Array): boolean {
  if (mediaType !== "application/octet-stream") return false
  if (bytes.length === 0) return false
  if (bytes.includes(0)) return false
  const sample = bytes.subarray(0, Math.min(bytes.length, 800))
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(sample)
  const replacements = (decoded.match(/\uFFFD/g) ?? []).length
  return replacements === 0 && /[\t\n\r\x20-\x7E\u0080-\uFFFF]/.test(decoded)
}
