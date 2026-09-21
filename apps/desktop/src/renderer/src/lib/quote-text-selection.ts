/**
 * 气泡划词收成 QuotedContext。截断对齐合同上限。
 */
import type { QuotedContext } from "@enjoy-agents/ipc-contract"

/** 与合同 QUOTE_SNIPPET_MAX 对齐；单测不打 ipc-contract 桶导出。 */
const SNIPPET_MAX = 2000

export function quoteTextSelection(input: { text: string; messageId?: string }): QuotedContext | null {
  const text = input.text.replace(/[ \t]+\n/g, "\n").trim()
  if (!text) return null
  const body = text.slice(0, SNIPPET_MAX)
  const title = body.split(/\n/)[0]?.slice(0, 40) || "selection"
  return {
    id: `quote_sel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    sourceId: input.messageId,
    type: "text_selection",
    title,
    snippet: body,
    content: body
  }
}

export function selectionInsideThread(selection: Selection | null): { text: string; messageId?: string } | null {
  if (!selection || selection.isCollapsed) return null
  const text = selection.toString()
  if (!text.trim()) return null
  const start = elementOf(selection.anchorNode)
  const end = elementOf(selection.focusNode)
  if (!start || !end) return null
  if (blockedTarget(start) || blockedTarget(end)) return null
  const startBubble = start.closest("[data-thread-message]")
  const endBubble = end.closest("[data-thread-message]")
  if (!startBubble || startBubble !== endBubble) return null
  const messageId = startBubble.getAttribute("data-thread-message") ?? undefined
  return { text, messageId }
}

function elementOf(node: Node | null): Element | null {
  if (!node) return null
  return node instanceof Element ? node : node.parentElement
}

function blockedTarget(node: Element): boolean {
  return Boolean(node.closest("textarea, input, [data-composer], [data-thread-find-bar]"))
}
