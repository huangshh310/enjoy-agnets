/**
 * Claude Code jsonl：累加 assistant.message.usage。没有字段就跳过该行。
 */
import {
  addUsage,
  asRecord,
  dayKeyFromTimestamp,
  emptyUsage,
  projectLabelFromCwd,
  stringField,
  usageFromTokenFields,
  type UsageDelta
} from "./parse-usage.ts"

export function parseClaudeTranscript(text: string): UsageDelta {
  let acc = emptyUsage()
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
    acc.project = projectLabelFromCwd(stringField(row, "cwd")) ?? acc.project
    const message = asRecord(row.message)
    acc.model = stringField(message, "model") ?? stringField(row, "model") ?? acc.model
    const usage = usageFromTokenFields(asRecord(message?.usage) ?? asRecord(row.usage))
    if (!usage) continue
    acc = addUsage(acc, usage)
  }
  return acc
}
