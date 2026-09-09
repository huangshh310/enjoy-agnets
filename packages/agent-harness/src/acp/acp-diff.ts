/**
 * 从 ACP tool_call content 抽出 type=diff，供 Review / file.changed 使用。
 * 不在这里 yield approval.required。
 */

export type AcpDiffBlock = { path: string; diff: string }

export function extractAcpDiffs(value: unknown): AcpDiffBlock[] {
  const blocks = contentBlocks(value)
  const out: AcpDiffBlock[] = []
  for (const block of blocks) {
    if (String(block.type ?? "") !== "diff") continue
    const path = pickDiffPath(block)
    const diff = String(block.diff ?? block.text ?? block.patch ?? "")
    if (!path || !diff) continue
    out.push({ path, diff })
  }
  return out
}

function contentBlocks(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (!isRecord(value)) return []
  if (Array.isArray(value.content)) return value.content.filter(isRecord)
  return [value]
}

function pickDiffPath(block: Record<string, unknown>): string | null {
  for (const key of ["path", "file", "filePath", "file_path", "newPath", "oldPath"] as const) {
    const raw = block[key]
    if (typeof raw === "string" && looksLikePath(raw)) return normalizePath(raw)
  }
  return null
}

function looksLikePath(value: string): boolean {
  const text = value.trim()
  if (!text || text.length > 400 || /[\n\r]/.test(text)) return false
  return text.includes("/") || text.includes("\\") || /\.[a-z0-9]{1,12}$/i.test(text)
}

function normalizePath(value: string): string {
  return value.trim().replace(/^file:\/\//, "").replace(/\\/g, "/")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
