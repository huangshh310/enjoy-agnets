/**
 * Codex rollout jsonl：每个文件只取最后一次 token_count 的累计，避免把每轮再加一遍。
 */
import {
  asRecord,
  dayKeyFromTimestamp,
  emptyUsage,
  projectLabelFromCwd,
  stringField,
  usageFromTokenFields,
  type UsageDelta
} from "./parse-usage.ts"

export function parseCodexTranscript(text: string): UsageDelta {
  const acc = emptyUsage()
  let lastUsage: UsageDelta | null = null
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    const row = asRecord(parsed)
    if (!row) continue
    acc.day = dayKeyFromTimestamp(row.timestamp) ?? acc.day
    const payload = asRecord(row.payload)
    if (row.type === "session_meta" && payload) {
      acc.project = projectLabelFromCwd(stringField(payload, "cwd")) ?? acc.project
      acc.model =
        stringField(payload, "model") ?? stringField(payload, "model_provider") ?? acc.model
      continue
    }
    if (row.type !== "event_msg" || stringField(payload, "type") !== "token_count") continue
    const info = asRecord(payload?.info)
    const totals = usageFromTokenFields(asRecord(info?.total_token_usage))
    if (totals) lastUsage = totals
  }
  if (!lastUsage) return acc
  return {
    ...acc,
    inputTokens: lastUsage.inputTokens,
    outputTokens: lastUsage.outputTokens,
    cacheTokens: lastUsage.cacheTokens,
    totalTokens: lastUsage.totalTokens
  }
}
