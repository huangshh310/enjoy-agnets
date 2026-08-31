/**
 * 离线确定性向量：无 Provider 时也能走余弦检索。
 * 有 embedding 模型时由 main 用 embedMany 覆盖。
 */
const DEFAULT_DIMS = 32

export function hashedEmbedding(text: string, dims = DEFAULT_DIMS): number[] {
  const vector = new Array<number>(dims).fill(0)
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean)
  if (tokens.length === 0) return vector
  for (const token of tokens) {
    const slot = hashToken(token) % dims
    vector[slot] = (vector[slot] ?? 0) + 1
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (norm === 0) return vector
  return vector.map((value) => value / norm)
}

function hashToken(token: string): number {
  let hash = 2166136261
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
