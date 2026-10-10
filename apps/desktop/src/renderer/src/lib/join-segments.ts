/**
 * 用「 · 」拼接文案段。空串 / 空白 / null 直接跳过，避免「a ·  · b」或开头多余点。
 */
export function joinSegments(...parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter((part) => part.length > 0)
    .join(" · ")
}
