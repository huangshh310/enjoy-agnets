/**
 * 扫描件 OCR：本机 tesseract。没有引擎就诚实放弃，不装成已识别。
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { extractPdfImages, type PdfImage } from "./pdf-images.ts"

export type OcrRunner = (image: PdfImage) => string | null

const OCR_TIMEOUT_MS = 20_000

export function extractPdfOcrText(
  bytes: Uint8Array,
  run?: OcrRunner | false
): { text: string; skipped?: string } {
  if (run === false) return { text: "" }
  const images = extractPdfImages(Buffer.from(bytes).toString("latin1"))
  if (images.length === 0) return { text: "" }
  const runner = run ?? runTesseract
  if (!run && !tesseractAvailable()) return { text: "", skipped: "pdf-ocr-unavailable" }
  const parts = images.map((image) => runner(image)?.trim()).filter(Boolean)
  if (parts.length === 0) return { text: "", skipped: "pdf-unreadable" }
  return { text: parts.join("\n\n") }
}

let cachedBin: string | null | undefined

export function tesseractAvailable(): boolean {
  if (cachedBin !== undefined) return cachedBin !== null
  const probe = spawnSync("tesseract", ["--version"], { encoding: "utf8", timeout: 4000 })
  cachedBin = probe.error || (probe.status ?? 1) !== 0 ? null : "tesseract"
  return cachedBin !== null
}

export function runTesseract(image: PdfImage): string | null {
  if (!tesseractAvailable()) return null
  const dir = mkdtempSync(join(tmpdir(), "enjoy-ocr-"))
  const file = join(dir, image.format === "jpeg" ? "page.jpg" : "page.pnm")
  try {
    writeFileSync(file, image.bytes)
    const result = spawnSync("tesseract", [file, "stdout", "--psm", "6"], {
      encoding: "utf8",
      timeout: OCR_TIMEOUT_MS
    })
    if (result.error || (result.status ?? 1) !== 0) return null
    const text = (result.stdout ?? "").trim()
    return text || null
  } catch {
    return null
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
