/**
 * 本机记录用量合计与拆分展示。Codex 常只有 total_tokens，拆分全 0 不当成真零。
 */
import type { CliUsageBucket } from "@enjoy-agents/ipc-contract"

const EMPTY_BUCKET: CliUsageBucket = {
  key: "total",
  inputTokens: 0,
  outputTokens: 0,
  cacheTokens: 0,
  totalTokens: 0,
  sessions: 0
}

export function sumBuckets(rows: CliUsageBucket[]): CliUsageBucket {
  return rows.reduce(
    (acc, row) => ({
      key: "total",
      inputTokens: acc.inputTokens + row.inputTokens,
      outputTokens: acc.outputTokens + row.outputTokens,
      cacheTokens: acc.cacheTokens + row.cacheTokens,
      totalTokens: acc.totalTokens + row.totalTokens,
      sessions: acc.sessions + row.sessions
    }),
    EMPTY_BUCKET
  )
}

/** 输入/输出/缓存任一大于 0 才认为有拆分。 */
export function hasTokenBreakdown(
  bucket: Pick<CliUsageBucket, "inputTokens" | "outputTokens" | "cacheTokens">
): boolean {
  return bucket.inputTokens + bucket.outputTokens + bucket.cacheTokens > 0
}

export function sharePercent(value: number, total: number): number | undefined {
  if (total <= 0 || value < 0) return undefined
  return Math.round((value / total) * 100)
}
