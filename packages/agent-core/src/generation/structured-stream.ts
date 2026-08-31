/**
 * 结构化增量流与校验失败重试。走 streamText + Output，不用 v4 streamObject。
 */
import { streamText, Output, type LanguageModel } from "ai"
import type { ZodType } from "zod"
import { generateStructuredArray, generateStructuredObject } from "./structured.ts"

export function repairStructuredPrompt(prompt: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `${prompt}\n\nPrevious structured output failed validation: ${message}. Return a valid result only.`
}

/** 从 fullStream part 取出对象增量；识别不了就返回 undefined。 */
export function pickStructuredPartial(part: Record<string, unknown>): unknown | undefined {
  const type = String(part.type ?? "")
  if (type === "object" || type === "object-delta" || type === "output") {
    return part.object ?? part.delta ?? part.output ?? part.partial
  }
  if (part.object && typeof part.object === "object") return part.object
  if (part.partial && typeof part.partial === "object") return part.partial
  return undefined
}

export async function* streamStructuredPartials(options: {
  model: LanguageModel
  prompt: string
  schema: ZodType<unknown>
  abortSignal?: AbortSignal
  array?: boolean
}): AsyncGenerator<unknown> {
  const result = streamText({
    model: options.model,
    prompt: options.prompt,
    abortSignal: options.abortSignal,
    output: options.array
      ? Output.array({ element: options.schema })
      : Output.object({ schema: options.schema })
  })
  const streamed = result as {
    partialOutputStream?: AsyncIterable<unknown>
    fullStream: AsyncIterable<Record<string, unknown>>
  }
  let yielded = false
  if (streamed.partialOutputStream) {
    for await (const partial of streamed.partialOutputStream) {
      yielded = true
      yield partial
    }
    if (yielded) return
  }
  for await (const part of streamed.fullStream) {
    const partial = pickStructuredPartial(part)
    if (partial === undefined) continue
    yielded = true
    yield partial
  }
}

export async function generateStructuredRepaired<T>(options: {
  model: LanguageModel
  prompt: string
  schema: ZodType<T>
  abortSignal?: AbortSignal
  array?: boolean
}): Promise<T | T[]> {
  try {
    return await generateOnce(options)
  } catch (error) {
    return generateOnce({
      ...options,
      prompt: repairStructuredPrompt(options.prompt, error)
    })
  }
}

function generateOnce<T>(options: {
  model: LanguageModel
  prompt: string
  schema: ZodType<T>
  abortSignal?: AbortSignal
  array?: boolean
}): Promise<T | T[]> {
  if (options.array) {
    return generateStructuredArray({
      model: options.model,
      prompt: options.prompt,
      elementSchema: options.schema,
      abortSignal: options.abortSignal
    })
  }
  return generateStructuredObject({
    model: options.model,
    prompt: options.prompt,
    schema: options.schema,
    abortSignal: options.abortSignal
  })
}
