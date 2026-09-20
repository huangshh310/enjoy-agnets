/**
 * 会话消息 → Preview Rail 条目。纯函数，方便 node:test。
 */
export type RailMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type ThreadRailItem = {
  id: string
  label: string
  ariaLabel: string
  description: string
  tickClassName?: string
  itemClassName?: string
}

export function previewItemsFromMessages(
  messages: RailMessage[],
  labels: { user: string; assistant: string; empty: string }
): ThreadRailItem[] {
  return messages.map((message) => {
    const snippet = messageSnippet(message.content)
    const isUser = message.role === "user"
    const who = isUser ? labels.user : labels.assistant
    return {
      id: message.id,
      label: who,
      ariaLabel: `${who}: ${snippet || labels.empty}`,
      description: snippet || labels.empty,
      itemClassName: isUser ? "text-accent-600 dark:text-accent-400 font-medium" : "text-text-tertiary",
      tickClassName: isUser ? "bg-accent-500 rounded-full" : undefined
    }
  })
}

export function messageSnippet(content: string, max = 72): string {
  const text = content.replace(/\s+/g, " ").trim()
  if (!text) return ""
  return text.length <= max ? text : `${text.slice(0, max)}…`
}

export function railItemSize(count: number) {
  if (count <= 8) return 22
  if (count <= 16) return 18
  return 14
}
