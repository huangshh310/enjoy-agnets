/**
 * persist 双写或连点发送会产生相邻两条相同用户句。
 */

export function dedupeConsecutiveUserTurns<T extends { role: string; content: string }>(
  rows: T[]
): T[] {
  const next: T[] = []
  for (const row of rows) {
    const prev = next.at(-1)
    if (prev && prev.role === "user" && row.role === "user" && prev.content === row.content) {
      continue
    }
    next.push(row)
  }
  return next
}
