/**
 * 按会话时间窗挑该轮 baseline 检查点。
 */

export function pickTurnBaseline<T extends { sessionId?: string; kind?: string; createdAt: number }>(
  checkpoints: T[],
  input: { sessionId: string; from: number; until?: number }
): T | null {
  const hits = checkpoints.filter(
    (item) =>
      item.sessionId === input.sessionId &&
      item.kind === "baseline" &&
      item.createdAt >= input.from &&
      (input.until == null || item.createdAt < input.until)
  )
  hits.sort((left, right) => left.createdAt - right.createdAt)
  return hits[0] ?? null
}
