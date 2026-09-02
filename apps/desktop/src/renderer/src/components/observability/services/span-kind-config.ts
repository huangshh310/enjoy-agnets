/**
 * Span 类型颜色与 locale 展示名。
 */
import type { TranslateFn } from "@renderer/i18n"

/** 颜色与样式元数据映射 */
export const SPAN_KIND_CONFIG: Record<
  string,
  { label: string; color: string; badgeClass: string; barColor: string }
> = {
  agent: {
    label: "Agent",
    color: "#f43f5e",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    barColor: "bg-rose-500"
  },
  workflow: {
    label: "Workflow",
    color: "#3b82f6",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    barColor: "bg-blue-500"
  },
  chat: {
    label: "Chat",
    color: "#8b5cf6",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    barColor: "bg-purple-500"
  },
  retrieval: {
    label: "Retrieval",
    color: "#06b6d4",
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    barColor: "bg-cyan-500"
  },
  tool: {
    label: "Tool",
    color: "#10b981",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    barColor: "bg-emerald-500"
  },
  function: {
    label: "Function",
    color: "#14b8a6",
    badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    barColor: "bg-teal-500"
  },
  embeddings: {
    label: "Embeddings",
    color: "#d946ef",
    badgeClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
    barColor: "bg-fuchsia-500"
  },
  http: {
    label: "HTTP",
    color: "#f59e0b",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    barColor: "bg-amber-500"
  },
  stream: {
    label: "Stream",
    color: "#0284c7",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    barColor: "bg-sky-500"
  }
}

/** 按 locale 覆盖 Span 类型展示名，颜色保持不变。 */
export function getSpanKindConfig(t: TranslateFn): typeof SPAN_KIND_CONFIG {
  const next: typeof SPAN_KIND_CONFIG = { ...SPAN_KIND_CONFIG }
  for (const key of Object.keys(next)) {
    const item = next[key]
    if (!item) continue
    next[key] = {
      ...item,
      label: t(`pages.observability.span${key.charAt(0).toUpperCase()}${key.slice(1)}`)
    }
  }
  return next
}
