/**
 * 待验收元数据落库。只在 turn 标 needs_review 且本轮真写过文件时刷新 completedAt。
 * 上一态不是 needs_review（通过 / 打回后）从空开始；total 是去重后的路径集合大小。
 */
import { ReviewChangedFiles, type TurnOutcome } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"

export const REVIEW_FILE_NAME_MAX = 80

export function persistSessionReview(sessionId: string | undefined, turn: TurnOutcome): void {
  if (!sessionId || turn.workflow !== "needs_review") return
  try {
    const wrote = reviewTurnWrote(turn.changedFiles)
    if (!wrote) return
    const db = getDatabase()
    const row = db
      .prepare(
        "SELECT workflow_status as workflow, review_changed_files as files, review_completed_at as completedAt FROM sessions WHERE id = ?"
      )
      .get(sessionId) as
      | { workflow?: string | null; files?: string | null; completedAt?: string | null }
      | undefined
    const previous = reviewFilesToCarry(row?.workflow, parseReviewChangedFiles(row?.files))
    const carry = previous !== undefined || row?.workflow === "needs_review"
    const merged = mergeReviewChangedFiles(previous, turn.changedFiles)
    db.prepare(
      "UPDATE sessions SET review_changed_files = ?, review_completed_at = ? WHERE id = ?"
    ).run(
      merged ? JSON.stringify(merged) : null,
      turn.completedAt ?? (carry ? row?.completedAt : null) ?? null,
      sessionId
    )
  } catch (error) {
    console.error("persistSessionReview failed", error)
  }
}

/** 通过 / 打回后上一态不是 needs_review，改动文件从空开始。 */
export function reviewFilesToCarry(
  previousWorkflow: string | null | undefined,
  previous: ReviewChangedFiles | undefined
): ReviewChangedFiles | undefined {
  return previousWorkflow === "needs_review" ? previous : undefined
}

export function reviewTurnWrote(files: ReviewChangedFiles | undefined): boolean {
  return Boolean(files && (files.names.length > 0 || files.total > 0))
}

export function clipReviewFileName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""
  return trimmed.length <= REVIEW_FILE_NAME_MAX ? trimmed : trimmed.slice(0, REVIEW_FILE_NAME_MAX)
}

/** 上一态不是 needs_review 时 previous 应为空；total = 去重路径数。 */
export function mergeReviewChangedFiles(
  previous: ReviewChangedFiles | undefined,
  incoming: ReviewChangedFiles | undefined
): ReviewChangedFiles | undefined {
  const names: string[] = []
  const seen = new Set<string>()
  for (const name of [...(previous?.names ?? []), ...(incoming?.names ?? [])]) {
    const clipped = clipReviewFileName(name)
    if (!clipped || seen.has(clipped)) continue
    seen.add(clipped)
    names.push(clipped)
  }
  const unnamed =
    Math.max(0, (previous?.total ?? 0) - (previous?.names.length ?? 0)) +
    Math.max(0, (incoming?.total ?? 0) - (incoming?.names.length ?? 0))
  const total = seen.size + unnamed
  if (names.length === 0 && total === 0) return undefined
  return { names: names.slice(0, 3), total }
}

export function parseReviewChangedFiles(raw: string | null | undefined): ReviewChangedFiles | undefined {
  if (!raw) return undefined
  try {
    const parsed = ReviewChangedFiles.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
