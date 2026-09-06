/**
 * 从工具参数 / 结果 / 命令里抽出可点域名胶囊。点开右栏浏览器。
 */
import { parseHttpUrl } from "../../../../lib/http-url.ts"
import type { DomainPill } from "./agent-step-tree.types.ts"

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi

export function extractDomainPills(
  args: Record<string, unknown>,
  result: Record<string, unknown>,
  command?: string
): DomainPill[] {
  const raw: string[] = []
  pushUrl(raw, args.url)
  pushUrl(raw, args.href)
  pushUrls(raw, args.urls)
  pushUrl(raw, result.url)
  pushUrls(raw, result.urls)
  pushSources(raw, result.sources)
  if (command) raw.push(...(command.match(URL_RE) ?? []))

  const seen: Record<string, true> = {}
  const pills: DomainPill[] = []
  for (const item of raw) {
    const href = parseHttpUrl(item)
    if (!href) continue
    const label = hostLabel(href)
    if (!label || seen[label]) continue
    seen[label] = true
    pills.push({ id: `domain_${label}`, label, url: href })
  }
  return pills
}

function pushUrl(into: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) into.push(value.trim())
}

function pushUrls(into: string[], value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) pushUrl(into, item)
}

function pushSources(into: string[], value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    if (item && typeof item === "object" && "url" in item) {
      pushUrl(into, (item as { url: unknown }).url)
    }
  }
}

function hostLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}
