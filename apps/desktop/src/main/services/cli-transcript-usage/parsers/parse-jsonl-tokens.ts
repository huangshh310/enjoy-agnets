/**
 * 通用 jsonl 用量：每行累加 message.usage / usage。无字段则全 0。
 * 认 Claude snake_case 与 OMP camelCase，不读正文。
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

export function parseJsonlTokenTranscript(text: string): UsageDelta {
  let acc = emptyUsage()
  for (const line of text.split("\n")) {
    const row = parseRow(line)
    if (!row) continue
    acc.day = dayKeyFromTimestamp(row.timestamp ?? row.updatedAt) ?? acc.day
    acc.project = projectLabelFromCwd(stringField(row, "cwd")) ?? acc.project
    acc.model = pickModel(row) ?? acc.model
    const message = asRecord(row.message)
    const usage =
      usageFromTokenFields(asRecord(message?.usage)) ?? usageFromTokenFields(asRecord(row.usage))
    if (!usage) continue
    acc = addUsage(acc, usage)
  }
  return acc
}

function parseRow(line: string): Record<string, unknown> | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return asRecord(JSON.parse(trimmed))
  } catch {
    return null
  }
}

function pickModel(row: Record<string, unknown>): string | undefined {
  const message = asRecord(row.message)
  const raw =
    stringField(row, "model") ?? stringField(message, "model") ?? stringField(row, "primaryModelId")
  if (!raw) return undefined
  const slash = raw.lastIndexOf("/")
  return slash >= 0 ? raw.slice(slash + 1) : raw
}
