/**
 * Valibot / Standard Schema 形适配到 Zod。IPC 只传 JSON 形，不传运行时实例。
 */
import { z, type ZodType } from "zod"
import { jsonSchemaToZod } from "./structured.ts"

const VALIBOT_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "integer",
  "array",
  "object",
  "optional",
  "nullable"
])

export function isValibotShape(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false
  const rec = schema as { type?: unknown; "~standard"?: unknown; entries?: unknown }
  if ("~standard" in rec) return true
  return typeof rec.type === "string" && VALIBOT_TYPES.has(rec.type) && ("entries" in rec || "item" in rec || "wrapped" in rec)
}

export function valibotShapeToZod(schema: unknown): ZodType<unknown> {
  if (!schema || typeof schema !== "object") return jsonSchemaToZod(schema)
  const rec = schema as {
    type?: string
    entries?: Record<string, unknown>
    item?: unknown
    wrapped?: unknown
    required?: string[]
    properties?: Record<string, unknown>
  }
  if (rec.type === "string") return z.string()
  if (rec.type === "number") return z.number()
  if (rec.type === "integer") return z.number().int()
  if (rec.type === "boolean") return z.boolean()
  if (rec.type === "optional" && rec.wrapped) return valibotShapeToZod(rec.wrapped).optional()
  if (rec.type === "nullable" && rec.wrapped) return valibotShapeToZod(rec.wrapped).nullable()
  if (rec.type === "array") return z.array(valibotShapeToZod(rec.item))
  if (rec.type === "object" && rec.entries) {
    const shape: Record<string, ZodType<unknown>> = {}
    for (const [key, value] of Object.entries(rec.entries)) {
      shape[key] = valibotShapeToZod(value)
    }
    return z.object(shape)
  }
  return jsonSchemaToZod(schema)
}

/** JSON Schema、Valibot 形、或已是 Zod 都收成 Zod。 */
export function toZodSchema(schema: unknown): ZodType<unknown> {
  if (schema && typeof schema === "object" && "_zod" in schema) return schema as ZodType<unknown>
  if (isValibotShape(schema)) return valibotShapeToZod(schema)
  return jsonSchemaToZod(schema)
}
