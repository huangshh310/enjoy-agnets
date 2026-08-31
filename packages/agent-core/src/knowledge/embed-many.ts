/**
 * Provider embedding 批量调用。失败返回 null，调用方回落到 hashedEmbedding。
 */
import { embed, embedMany } from "ai"

export async function embedTexts(model: unknown, values: string[]): Promise<number[][] | null> {
  if (values.length === 0) return []
  try {
    const result = await embedMany({ model: model as never, values })
    const vectors = (result as { embeddings?: number[][] }).embeddings
    return vectors ?? null
  } catch {
    return null
  }
}

export async function embedQuery(model: unknown, value: string): Promise<number[] | null> {
  try {
    const result = await embed({ model: model as never, value })
    return (result as { embedding?: number[] }).embedding ?? null
  } catch {
    return null
  }
}
