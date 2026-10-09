/**
 * 渲染进程外链：Zod 之后再用 URL 复验，只放行 http(s)。
 */
const ALLOWED = new Set(["http:", "https:"])
const REJECTED = new Set(["file:", "javascript:", "data:", "blob:", "about:"])

export function planExternalHttpUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error("OPEN_EXTERNAL_INVALID")
  }
  if (REJECTED.has(parsed.protocol) || !ALLOWED.has(parsed.protocol)) {
    throw new Error("OPEN_EXTERNAL_NOT_ALLOWED")
  }
  return parsed.href
}

export async function openExternalHttpUrl(
  raw: string,
  open: (href: string) => Promise<void>
): Promise<{ ok: true }> {
  await open(planExternalHttpUrl(raw))
  return { ok: true }
}
