/**
 * 本地余弦相似度。不把整篇文档塞进 prompt，只排序 chunk。
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    dot += x * y
    normA += x * x
    normB += y * y
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function rankByCosine(
  query: number[],
  items: Array<{ id: string; vector: number[] }>,
  limit: number
): Array<{ id: string; score: number }> {
  return items
    .map((item) => ({ id: item.id, score: cosineSimilarity(query, item.vector) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}

/** 无 embedding 时的词袋兜底，便于离线检索。 */
export function lexicalScore(query: string, text: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0
  const hay = text.toLowerCase()
  const hits = terms.filter((term) => hay.includes(term)).length
  return hits / terms.length
}
