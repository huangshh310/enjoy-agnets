/**
 * 渲染进程外链：Zod 之后再用 URL 复验，只放行 http(s)，失败回码不抛。
 */
import type { WindowOpenExternalResult } from "@enjoy-agents/ipc-contract"

const ALLOWED = new Set(["http:", "https:"])
const REJECTED = new Set(["file:", "javascript:", "data:", "blob:", "about:"])

export type ExternalUrlPlan =
  | { ok: true; href: string }
  | { ok: false; code: "OPEN_EXTERNAL_INVALID" | "OPEN_EXTERNAL_NOT_ALLOWED" }

export function planExternalHttpUrl(raw: string): ExternalUrlPlan {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, code: "OPEN_EXTERNAL_INVALID" }
  }
  if (parsed.username || parsed.password) {
    return { ok: false, code: "OPEN_EXTERNAL_NOT_ALLOWED" }
  }
  if (REJECTED.has(parsed.protocol) || !ALLOWED.has(parsed.protocol)) {
    return { ok: false, code: "OPEN_EXTERNAL_NOT_ALLOWED" }
  }
  return { ok: true, href: parsed.href }
}

export async function openExternalHttpUrl(
  raw: string,
  open: (href: string) => Promise<void>
): Promise<WindowOpenExternalResult> {
  const planned = planExternalHttpUrl(raw)
  if (!planned.ok) return planned
  await open(planned.href)
  return { ok: true }
}
