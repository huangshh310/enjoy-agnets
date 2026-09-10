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

type JsonSchemaRec = {
  type?: string
  properties?: Record<string, unknown>
  items?: unknown
  required?: string[]
  enum?: unknown[]
  anyOf?: unknown[]
  oneOf?: unknown[]
  $ref?: string
}

/** 把常见 JSON Schema 收成 Zod；`$ref` / 无法识别的结构回落 unknown。 */
export function jsonSchemaToZod(schema: unknown): ZodType<unknown> {
  if (!schema || typeof schema !== "object") return z.unknown()
  const rec = schema as JsonSchemaRec
  if (rec.$ref) return z.unknown()
  const enumerated = enumFromJsonSchema(rec.enum)
  if (enumerated) return enumerated
  const union = unionFromJsonSchema(rec.anyOf ?? rec.oneOf)
  if (union) return union
  if (rec.type === "string") return z.string()
  if (rec.type === "number") return z.number()
  if (rec.type === "integer") return z.number().int()
  if (rec.type === "boolean") return z.boolean()
  if (rec.type === "array") return z.array(jsonSchemaToZod(rec.items))
  if (rec.type === "object") return objectFromJsonSchema(rec.properties ?? {}, rec.required ?? [])
  return z.unknown()
}

function enumFromJsonSchema(values: unknown[] | undefined): ZodType<unknown> | undefined {
  if (!values?.length) return undefined
  if (!values.every((item) => typeof item === "string")) return undefined
  return z.enum(values as [string, ...string[]])
}

function unionFromJsonSchema(options: unknown[] | undefined): ZodType<unknown> | undefined {
  if (!options?.length) return undefined
  const mapped = options.map(jsonSchemaToZod)
  if (mapped.length === 1) return mapped[0]
  return z.union(mapped as [ZodType<unknown>, ZodType<unknown>, ...ZodType<unknown>[]])
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
