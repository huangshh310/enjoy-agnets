/**
 * useObject 抽取：把助手正文收成结构化卡片，走 IPC。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { generateObject } from "./use-object"
import { waitForRunOutput } from "./wait-run-events"

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    items: { type: "array", items: { type: "string" } }
  },
  required: ["title", "summary"]
}

export async function extractObjectFromMessage(messageId: string) {
  const store = useChatStore.getState()
  const message = store.messages.find((item) => item.id === messageId)
  if (!message?.content.trim() || !store.sessionId) return
  const result = (await generateObject({
    sessionId: store.sessionId,
    modelId: store.modelId,
    prompt: `Extract title, summary, and items from this assistant reply:\n${message.content.slice(0, 4000)}`,
    schemaJson: EXTRACT_SCHEMA
  })) as { runId: string }
  const output = await waitForRunOutput(result.runId)
  if (output.structured == null) return
  const latest = useChatStore.getState()
  latest.setMessages(
    latest.messages.map((item) =>
      item.id === messageId
        ? {
            ...item,
            structured: output.structured,
            components: upsertCard(item.components, output.structured)
          }
        : item
    )
  )
}

function upsertCard(
  components: Array<{ componentId: string; props: Record<string, unknown> }> | undefined,
  value: unknown
) {
  const next = (components ?? []).filter((item) => item.componentId !== "card")
  next.push({ componentId: "card", props: { value } })
  return next
}
