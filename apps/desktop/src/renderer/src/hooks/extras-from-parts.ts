/**
 * 从 UIMessage parts 抽出引用 / 资产 / 结构化 / 生成式 UI，不依赖 IPC barrel。
 */
export type RestoredComponent = {
  componentId: string
  props: Record<string, unknown>
}

export type RestoredExtras = {
  sources: Array<{
    sourceId: string
    title: string
    path: string
    startLine?: number
    endLine?: number
    snippet?: string
  }>
  assets: Array<{ assetId: string; mediaType: string; name: string }>
  structured?: unknown
  components: RestoredComponent[]
}

const ALLOWED_COMPONENT_IDS = new Set([
  "card",
  "form",
  "table",
  "source-list",
  "approval",
  "asset-preview",
  "todo-list"
])

export function extrasFromParts(parts: unknown[] | undefined): RestoredExtras {
  const sources: RestoredExtras["sources"] = []
  const assets: RestoredExtras["assets"] = []
  const components: RestoredComponent[] = []
  let structured: unknown
  for (const part of parts ?? []) {
    if (!part || typeof part !== "object") continue
    const record = part as Record<string, unknown>
    if (record.type === "source" && typeof record.sourceId === "string") {
      sources.push({
        sourceId: record.sourceId,
        title: String(record.title ?? ""),
        path: String(record.path ?? ""),
        startLine: typeof record.startLine === "number" ? record.startLine : undefined,
        endLine: typeof record.endLine === "number" ? record.endLine : undefined,
        snippet: typeof record.snippet === "string" ? record.snippet : undefined
      })
    }
    if (record.type === "file" && typeof record.assetId === "string") {
      assets.push({
        assetId: record.assetId,
        mediaType: String(record.mediaType ?? ""),
        name: String(record.name ?? "")
      })
    }
    if (record.type === "structured") structured = record.value
    if (record.type === "component" && typeof record.componentId === "string") {
      if (!ALLOWED_COMPONENT_IDS.has(record.componentId)) continue
      const props =
        record.props && typeof record.props === "object" && !Array.isArray(record.props)
          ? (record.props as Record<string, unknown>)
          : {}
      components.push({ componentId: record.componentId, props })
    }
  }
  return { sources, assets, structured, components }
}
