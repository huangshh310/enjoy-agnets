/**
 * 把本轮来源 / 资产 / 结构化折成 UIMessage parts，随 assistant 落库。
 */
import {
  clampThoughtSeconds,
  serializeAssistantPayload,
  type AssistantExtras,
  type AssistantRunKind,
  type ThreadToolCall,
  type UIMessagePart
} from "@enjoy-agents/ipc-contract"
import { persistMessage } from "./persist-session"

export function partsFromExtras(content: string, extras: AssistantExtras): UIMessagePart[] {
  const parts: UIMessagePart[] = []
  if (content.trim()) parts.push({ type: "text", text: content })
  for (const source of extras.sources ?? []) {
    parts.push({
      type: "source",
      sourceId: source.sourceId,
      title: source.title,
      path: source.path,
      startLine: source.startLine,
      snippet: source.snippet
    })
  }
  for (const asset of extras.assets ?? []) {
    parts.push({
      type: "file",
      assetId: asset.assetId,
      mediaType: asset.mediaType,
      name: asset.name
    })
  }
  if (extras.structured != null) {
    parts.push({ type: "structured", value: extras.structured })
  }
  parts.push(...componentPartsFromExtras(extras))
  return parts
}

/** 模型只能选白名单 componentId；这里从 extras 合成，不注入 React。 */
function componentPartsFromExtras(extras: AssistantExtras): UIMessagePart[] {
  const parts: UIMessagePart[] = []
  if (extras.sources?.length) {
    parts.push({
      type: "component",
      componentId: "source-list",
      props: { sources: extras.sources }
    })
  }
  if (extras.assets?.length) {
    parts.push({
      type: "component",
      componentId: "asset-preview",
      props: { assets: extras.assets }
    })
  }
  if (extras.structured != null) {
    parts.push({
      type: "component",
      componentId: structuredComponentId(extras.structured),
      props: { value: extras.structured }
    })
  }
  return parts
}

function structuredComponentId(value: unknown): "form" | "table" | "card" {
  if (Array.isArray(value)) return "table"
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>
    if (Array.isArray(rec.fields) || Array.isArray(rec.schema)) return "form"
    if (Array.isArray(rec.rows) || Array.isArray(rec.columns)) return "table"
  }
  return "card"
}

export function persistFinishedAssistant(input: {
  sessionId: string
  content: string
  reasoning: string
  tools: ThreadToolCall[]
  startedAt: number
  extras: AssistantExtras
  runKind?: AssistantRunKind
}) {
  const extras = input.extras
  const hasBody =
    input.content.trim() ||
    input.reasoning.trim() ||
    input.tools.length > 0 ||
    Boolean(extras.sources?.length) ||
    Boolean(extras.assets?.length) ||
    extras.structured != null
  if (!hasBody) return
  persistMessage(
    input.sessionId,
    "assistant",
    serializeAssistantPayload({
      content: input.content,
      reasoning: input.reasoning,
      tools: input.tools,
      thoughtSeconds: clampThoughtSeconds(input.startedAt) ?? undefined,
      sources: extras.sources,
      assets: extras.assets,
      structured: extras.structured,
      runKind: input.runKind
    }),
    partsFromExtras(input.content, extras)
  )
}
