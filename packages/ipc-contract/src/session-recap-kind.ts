/**
 * Recap 启发式落在正文头标里，免加列。注入 / 菜单展示前剥掉。
 */
export const RECAP_HEURISTIC_MARK = "[Enjoy recap kind: heuristic]"

export function recapIsHeuristic(raw?: string | null): boolean {
  return Boolean(raw?.trimStart().startsWith(RECAP_HEURISTIC_MARK))
}

export function visibleRecapText(raw?: string | null): string {
  const text = raw?.trim() ?? ""
  if (!text.startsWith(RECAP_HEURISTIC_MARK)) return text
  return text.slice(RECAP_HEURISTIC_MARK.length).trim()
}

export function markHeuristicRecap(recap: string): string {
  const body = visibleRecapText(recap)
  return body ? `${RECAP_HEURISTIC_MARK}\n${body}` : ""
}

export function storeSessionRecap(recap: string, heuristic: boolean): string {
  const body = visibleRecapText(recap)
  return heuristic ? markHeuristicRecap(body) : body
}
