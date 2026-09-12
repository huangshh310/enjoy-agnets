/**
 * Span 类型颜色与 locale 展示名。颜色只走 BoardUI chart / accent token，禁裸 hex。
 */
import type { TranslateFn } from "@renderer/i18n"

/** 颜色与样式元数据映射 */
export const SPAN_KIND_CONFIG: Record<
  string,
  { label: string; color: string; badgeClass: string; barColor: string }
> = {
  agent: {
    label: "Agent",
    color: "var(--color-chart-danger)",
    badgeClass: "bg-chart-danger/10 text-chart-danger-text border-chart-danger/20",
    barColor: "bg-chart-danger"
  },
  workflow: {
    label: "Workflow",
    color: "var(--color-accent-500)",
    badgeClass: "bg-accent-500/10 text-accent-600 dark:text-accent-400 border-accent-500/20",
    barColor: "bg-accent-500"
  },
  chat: {
    label: "Chat",
    color: "var(--color-chart-5)",
    badgeClass: "bg-chart-5/10 text-chart-5-active border-chart-5/20",
    barColor: "bg-chart-5"
  },
  retrieval: {
    label: "Retrieval",
    color: "var(--color-chart-4)",
    badgeClass: "bg-chart-4/10 text-chart-4-active border-chart-4/20",
    barColor: "bg-chart-4"
  },
  tool: {
    label: "Tool",
    color: "var(--color-chart-7)",
    badgeClass: "bg-chart-7/10 text-chart-7-active border-chart-7/20",
    barColor: "bg-chart-7"
  },
  function: {
    label: "Function",
    color: "var(--color-chart-1)",
    badgeClass: "bg-chart-1/10 text-chart-1-active border-chart-1/20",
    barColor: "bg-chart-1"
  },
  embeddings: {
    label: "Embeddings",
    color: "var(--color-chart-3)",
    badgeClass: "bg-chart-3/10 text-chart-3-active border-chart-3/20",
    barColor: "bg-chart-3"
  },
  http: {
    label: "HTTP",
    color: "var(--color-chart-warning)",
    badgeClass: "bg-chart-warning/10 text-chart-warning-text border-chart-warning/20",
    barColor: "bg-chart-warning"
  },
  stream: {
    label: "Stream",
    color: "var(--color-chart-6)",
    badgeClass: "bg-chart-6/10 text-chart-6-active border-chart-6/20",
    barColor: "bg-chart-6"
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
