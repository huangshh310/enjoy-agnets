/**
 * Extract 结果形状：title / summary / items，不要当裸 JSON 倒出来。
 */

export type ExtractObject = {
  title: string
  summary: string
  items: string[]
}

export const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    items: { type: "array", items: { type: "string" } }
  },
  required: ["title", "summary"]
}

export function asExtractObject(value: unknown): ExtractObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const rec = value as Record<string, unknown>
  if (typeof rec.title !== "string" || typeof rec.summary !== "string") return null
  const items = Array.isArray(rec.items)
    ? rec.items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
  return { title: rec.title.trim(), summary: rec.summary.trim(), items }
}

export function extractKind(content: string, hasImageAsset: boolean): "reply" | "generation" {
  if (content.trim()) return "reply"
  return hasImageAsset ? "generation" : "reply"
}

export function buildExtractPrompt(source: string, kind: "reply" | "generation") {
  const clipped = source.slice(0, 4000)
  if (kind === "generation") {
    return [
      "The assistant generated an image. Do not mention extraction, schemas, or that the reply was short.",
      "Return a short title, a one-sentence summary of the user's visual request, and 3-6 tags in items.",
      `User request:\n${clipped}`
    ].join("\n")
  }
  return `Extract title, a concise summary, and key points as items from this assistant reply:\n${clipped}`
}
