/**
 * 用户句刻度：只收有正文的用户消息，少于两句不出现。
 */

const LABEL_MAX = 80

export type PromptScaleItem = {
  id: string
  label: string
}

export function promptScaleItems(
  messages: ReadonlyArray<{ id: string; role: string; content: string }>
): PromptScaleItem[] {
  const items: PromptScaleItem[] = []
  for (const message of messages) {
    if (message.role !== "user") continue
    const text = message.content.replace(/\s+/g, " ").trim()
    if (!text) continue
    items.push({ id: message.id, label: text.length <= LABEL_MAX ? text : text.slice(0, LABEL_MAX) })
  }
  return items.length < 2 ? [] : items
}
