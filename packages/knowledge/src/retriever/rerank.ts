/**
 * 本地二次排序：词袋 + 向量分融合。无外部 rerank Provider 时的第二条路径。
 */
export function blendRerankScore(lexical: number, vector: number): number {
  return lexical * 0.35 + vector * 0.65
}

export function rerankHits<T extends { score: number; lexical?: number }>(hits: T[]): T[] {
  return [...hits]
    .map((hit) => ({
      ...hit,
      score: blendRerankScore(hit.lexical ?? hit.score, hit.score)
    }))
    .sort((left, right) => right.score - left.score)
}
