/**
 * useObject 抽取：把助手正文（或生图 prompt）收成结构化卡片。
 */
import { useChatStore } from "@renderer/stores/chat-store"
import { buildExtractPrompt, EXTRACT_SCHEMA, extractKind } from "./extract-object-shape"
import { extractSourceText, pickExtractModelId } from "./extract-source"
import { generateObject } from "./use-object"
import { waitForRunOutput } from "./wait-run-events"

export async function extractObjectFromMessage(messageId: string, fallbackText?: string) {
  const store = useChatStore.getState()
  const message = store.messages.find((item) => item.id === messageId)
  const source = extractSourceText(message?.content ?? "", fallbackText)
  if (!source || !store.sessionId) {
    store.setError("Nothing to extract from this reply.")
    return
  }
  const modelId = pickExtractModelId(store.modelId, store.models)
  if (!modelId) {
    store.setError("Extract needs a chat model. Switch the picker off imagine.")
    return
  }
  try {
    const kind = extractKind(
      message?.content ?? "",
      Boolean(message?.assets?.some((asset) => asset.mediaType.startsWith("image/")))
    )
    const result = (await generateObject({
      sessionId: store.sessionId,
      modelId,
      prompt: buildExtractPrompt(source, kind),
      schemaJson: EXTRACT_SCHEMA
    })) as { runId: string }
    const output = await waitForRunOutput(result.runId)
    if (output.structured == null) {
      store.setError("Extract did not return a structured object.")
      return
    }
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
    latest.setError(null)
  } catch (error) {
    store.setError(error instanceof Error ? error.message : String(error))
  }
}

function upsertCard(
  components: Array<{ componentId: string; props: Record<string, unknown> }> | undefined,
  value: unknown
) {
  const next = (components ?? []).filter((item) => item.componentId !== "card")
  next.push({ componentId: "card", props: { value } })
  return next
}
