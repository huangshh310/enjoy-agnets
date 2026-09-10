/**
 * 从 PDF 抽出可 OCR 的图像：JPEG（DCTDecode）或 8bit Gray/RGB 原始像素。
 */
import { applyFilters, listPdfStreams, parseFilters } from "./pdf-streams.ts"
import { encodePnm } from "./pdf-pnm.ts"

export type PdfImage = { format: "jpeg" | "pnm"; bytes: Uint8Array }

export const MAX_PDF_OCR_IMAGES = 8
const MAX_PIXELS = 8_000_000

export function extractPdfImages(pdfLatin1: string): PdfImage[] {
  const out: PdfImage[] = []
  for (const stream of listPdfStreams(pdfLatin1)) {
    if (out.length >= MAX_PDF_OCR_IMAGES) break
    if (!/\/Subtype\s*\/Image\b/.test(stream.dict)) continue
    const image = decodePdfImage(stream.dict, stream.bytes)
    if (image) out.push(image)
  }
  return out
}

function decodePdfImage(dict: string, bytes: Uint8Array): PdfImage | null {
  const decoded = applyFilters(dict, bytes)
  if (!decoded) return null
  const filters = parseFilters(dict)
  if (filters.includes("DCTDecode") || filters.includes("DCT")) {
    return decoded.length > 0 ? { format: "jpeg", bytes: decoded } : null
  }
  const width = dictInt(dict, "Width")
  const height = dictInt(dict, "Height")
  const bits = dictInt(dict, "BitsPerComponent") ?? 8
  if (!width || !height || bits !== 8 || width * height > MAX_PIXELS) return null
  const channels = colorChannels(dict)
  if (!channels) return null
  const pnm = encodePnm(decoded, width, height, channels)
  return pnm ? { format: "pnm", bytes: pnm } : null
}

function colorChannels(dict: string): 1 | 3 | null {
  if (/\/ColorSpace\s*\/DeviceGray\b/.test(dict)) return 1
  if (/\/ColorSpace\s*\/DeviceRGB\b/.test(dict)) return 3
  return null
}

function dictInt(dict: string, name: string): number | null {
  const match = new RegExp(`/${name}\\s+(\\d+)\\b`).exec(dict)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}
