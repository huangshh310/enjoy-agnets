/**
 * 结构化输出：Output.object / Output.array。schema 用 Zod 或 JSON Schema。
 */
import { generateText, Output, type LanguageModel } from "ai"
import { z, type ZodType } from "zod"

export async function generateStructuredObject<T>(options: {
  model: LanguageModel
  prompt: string
  schema: ZodType<T>
  abortSignal?: AbortSignal
}): Promise<T> {
  const { output } = await generateText({
    model: options.model,
    prompt: options.prompt,
    abortSignal: options.abortSignal,
    output: Output.object({ schema: options.schema })
  })
  return output as T
}

export async function generateStructuredArray<T>(options: {
  model: LanguageModel
  prompt: string
  elementSchema: ZodType<T>
  abortSignal?: AbortSignal
}): Promise<T[]> {
  const { output } = await generateText({
    model: options.model,
    prompt: options.prompt,
    abortSignal: options.abortSignal,
    output: Output.array({ element: options.elementSchema })
  })
  return output as T[]
}

/** 把简单 JSON Schema 收成 Zod；复杂 schema 回落 unknown，避免假装已校验。 */
export function jsonSchemaToZod(schema: unknown): ZodType<unknown> {
  if (!schema || typeof schema !== "object") return z.unknown()
  const rec = schema as {
    type?: string
    properties?: Record<string, unknown>
    items?: unknown
    required?: string[]
  }
  if (rec.type === "string") return z.string()
  if (rec.type === "number") return z.number()
  if (rec.type === "integer") return z.number().int()
  if (rec.type === "boolean") return z.boolean()
  if (rec.type === "array") return z.array(jsonSchemaToZod(rec.items))
  if (rec.type === "object") return objectFromJsonSchema(rec.properties ?? {}, rec.required ?? [])
  return z.unknown()
}

function objectFromJsonSchema(
  properties: Record<string, unknown>,
  required: string[]
): ZodType<unknown> {
  const shape: Record<string, ZodType<unknown>> = {}
  for (const [key, value] of Object.entries(properties)) {
    const field = jsonSchemaToZod(value)
    shape[key] = required.includes(key) ? field : field.optional()
  }
  return z.object(shape)
}
