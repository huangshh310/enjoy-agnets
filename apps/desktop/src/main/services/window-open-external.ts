/**
 * 渲染进程外链：只放行 http(s)，交给 shell.openExternal。
 */
export function planExternalHttpUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error("OPEN_EXTERNAL_INVALID")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
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
