/**
 * 版本化 UIMessage parts：消息从单一字符串迁到部件数组。
 * 旧 messages.content 仍作兼容字段；parts 缺失时由 migrate 从 content 生成。
 */
import { z } from "zod"

export const UIMessagePart = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("reasoning"), text: z.string() }),
  z.object({
    type: z.literal("tool"),
    toolCallId: z.string(),
    name: z.string(),
    args: z.unknown().optional(),
    result: z.unknown().optional(),
    error: z.string().optional(),
    state: z
      .enum([
        "input-streaming",
        "input-available",
        "approval-requested",
        "output-available",
        "output-error",
        "output-denied"
      ])
      .optional()
  }),
  z.object({
    type: z.literal("source"),
    sourceId: z.string(),
    title: z.string(),
    path: z.string(),
    startLine: z.number().int().optional(),
    endLine: z.number().int().optional(),
    snippet: z.string().optional()
  }),
  z.object({
    type: z.literal("file"),
    assetId: z.string(),
    mediaType: z.string(),
    name: z.string()
  }),
  z.object({ type: z.literal("structured"), value: z.unknown() }),
  z.object({
    type: z.literal("component"),
    componentId: z.string(),
    props: z.record(z.string(), z.unknown()).default({})
  })
])
export type UIMessagePart = z.infer<typeof UIMessagePart>

export const UIMessage = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(UIMessagePart),
  createdAt: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})
export type UIMessage = z.infer<typeof UIMessage>

/** 白名单生成式 UI 组件，模型只能选这些 id，不能注入 React。 */
export const GENERATIVE_COMPONENT_IDS = [
  "card",
  "form",
  "table",
  "source-list",
  "approval",
  "asset-preview",
  "todo-list"
] as const
export type GenerativeComponentId = (typeof GENERATIVE_COMPONENT_IDS)[number]

export function isGenerativeComponentId(value: string): value is GenerativeComponentId {
  return (GENERATIVE_COMPONENT_IDS as readonly string[]).includes(value)
}

/** 旧纯文本消息 → parts。assistant-payload JSON 仍由 parseAssistantPayload 处理。 */
export function migrateContentToParts(content: string): UIMessagePart[] {
  if (!content) return []
  return [{ type: "text", text: content }]
}

export function validateUIMessages(messages: unknown): UIMessage[] {
  return z.array(UIMessage).parse(messages)
}

export function safeValidateUIMessages(messages: unknown): UIMessage[] {
  const parsed = z.array(UIMessage).safeParse(messages)
  return parsed.success ? parsed.data : []
}
