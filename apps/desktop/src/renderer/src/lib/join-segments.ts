/**
 * 用「 · 」拼接文案段。空串 / 空白 / null 直接跳过，避免「a ·  · b」或开头多余点。
 */
const EMPTY_MARKS = new Set(["", "-", "–", "—", "·", ".", "•"])

export function isEmptyJoinPart(part: string): boolean {
  return EMPTY_MARKS.has(part)
}

export function joinSegments(...parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter((part) => !isEmptyJoinPart(part))
    .join(" · ")
}
