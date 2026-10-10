/**
 * 出字前回滚后，同一 runId 的迟到 run.start 不得再补用户泡。
 */
const MAX_DISCARDED = 8
const discarded: string[] = []

export function rememberDiscardedPreOutputRun(runId: string | undefined): void {
  if (!runId || discarded.includes(runId)) return
  discarded.push(runId)
  if (discarded.length > MAX_DISCARDED) discarded.shift()
}

export function isDiscardedPreOutputRun(runId: string | undefined): boolean {
  return Boolean(runId && discarded.includes(runId))
}

export function resetDiscardedPreOutputRunsForTest(): void {
  discarded.length = 0
}
