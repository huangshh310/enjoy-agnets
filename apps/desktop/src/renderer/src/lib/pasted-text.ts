/**
 * 大段粘贴收成文本附件：阈值与命名。⌘⇧V 强制内联。
 */

export const COMPOSER_MAX_CHARS = 120_000
export const PASTED_TEXT_THRESHOLD_BYTES = 32 * 1024

const textEncoder = new TextEncoder()

export type PastedTextDisposition = "attachment" | "inline"

export function clipboardModifiers(event: { nativeEvent?: object } | object): {
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
} {
  const source =
    "nativeEvent" in event && event.nativeEvent ? event.nativeEvent : event
  const rec = source as Record<string, unknown>
  return {
    shiftKey: Boolean(rec.shiftKey),
    metaKey: Boolean(rec.metaKey),
    ctrlKey: Boolean(rec.ctrlKey),
    altKey: Boolean(rec.altKey)
  }
}

export function isPasteInlineShortcut(event: {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}): boolean {
  return Boolean(event.shiftKey) && !event.altKey && Boolean(event.metaKey || event.ctrlKey)
}

export function pastedTextDisposition(input: {
  text: string
  bypassAutoAttachment?: boolean
  wouldExceedInputLimit?: boolean
}): PastedTextDisposition {
  if (input.bypassAutoAttachment || input.text.length === 0) return "inline"
  if (input.wouldExceedInputLimit) return "attachment"
  if (input.text.length >= PASTED_TEXT_THRESHOLD_BYTES) return "attachment"
  return textEncoder.encode(input.text).byteLength >= PASTED_TEXT_THRESHOLD_BYTES
    ? "attachment"
    : "inline"
}

export function wouldTextPasteExceedLimit(input: {
  valueLength: number
  selectionStart: number
  selectionEnd: number
  textLength: number
  maxLength?: number
}): boolean {
  const max = input.maxLength ?? COMPOSER_MAX_CHARS
  const start = clamp(input.selectionStart, 0, input.valueLength)
  const end = Math.max(start, clamp(input.selectionEnd, 0, input.valueLength))
  return input.valueLength - (end - start) + input.textLength > max
}

/** 同一草稿多段折叠粘贴时用 pasted-text.txt / pasted-text-2.txt。 */
export function nextPastedTextFileName(existingNames: readonly string[]): string {
  const names = new Set(existingNames.map((name) => name.toLowerCase()))
  if (!names.has("pasted-text.txt")) return "pasted-text.txt"
  for (let sequence = 2; ; sequence += 1) {
    const candidate = `pasted-text-${sequence}.txt`
    if (!names.has(candidate)) return candidate
  }
}

export function planComposerPaste(input: {
  text: string
  imageFiles: File[]
  value: string
  selectionStart: number
  selectionEnd: number
  existingNames: readonly string[]
  bypassAutoAttachment: boolean
}): { attach: File[]; preventDefault: boolean } {
  const attach: File[] = [...input.imageFiles]
  const disposition = pastedTextDisposition({
    text: input.text,
    bypassAutoAttachment: input.bypassAutoAttachment,
    wouldExceedInputLimit: wouldTextPasteExceedLimit({
      valueLength: input.value.length,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
      textLength: input.text.length
    })
  })
  if (disposition === "attachment") {
    attach.push(new File([input.text], nextPastedTextFileName(input.existingNames), { type: "text/plain" }))
    return { attach, preventDefault: true }
  }
  if (input.imageFiles.length > 0 && input.text.length === 0) {
    return { attach, preventDefault: true }
  }
  return { attach, preventDefault: false }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
