/**
 * Office Open XML 启发式抽 <w:t> 文本。不是完整 Word/Excel 引擎。
 */
export function extractOfficeXmlText(bytes: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  const tagMatches = [...raw.matchAll(/<([a-zA-Z0-9]+:)?t(?:\s+[^>]*)?>([^<]+)<\/([a-zA-Z0-9]+:)?t>/g)]
  if (tagMatches.length > 0) {
    return tagMatches.map((match) => match[2]?.trim() || "").filter(Boolean).join(" ")
  }
  const printable = raw.match(/[\p{L}\p{N}\p{P}\s]{4,}/gu) || []
  return printable.map((item) => item.trim()).filter((item) => item.length > 3).join("\n")
}
