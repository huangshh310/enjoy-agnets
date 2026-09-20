/**
 * 从 session/new 或 set_config_option 回执抽出 configOptions。
 */
import { SessionConfigOption, type SessionConfigChoice } from "@enjoy-agents/ipc-contract/session-config"

export function parseSessionConfigOptions(raw: unknown): SessionConfigOption[] {
  const rec = asRecord(raw)
  const list = Array.isArray(rec.configOptions) ? rec.configOptions : []
  const out: SessionConfigOption[] = []
  for (const item of list) {
    const parsed = parseOne(item)
    if (parsed) out.push(parsed)
  }
  return out
}

export function sessionConfigEvent(
  runId: string,
  options: SessionConfigOption[]
): { type: "session.config"; runId: string; configOptions: SessionConfigOption[] } | null {
  if (!options.length) return null
  return { type: "session.config", runId, configOptions: options }
}

function parseOne(raw: unknown): SessionConfigOption | null {
  const rec = asRecord(raw)
  const id = String(rec.id ?? rec.configId ?? "").trim()
  const name = String(rec.name ?? id).trim()
  if (!id || !name) return null
  const category = typeof rec.category === "string" ? rec.category : undefined
  const type = rec.type === "boolean" ? "boolean" : rec.type === "select" ? "select" : undefined
  const currentValue =
    typeof rec.currentValue === "boolean" || typeof rec.currentValue === "string"
      ? rec.currentValue
      : undefined
  const parsed = SessionConfigOption.safeParse({
    id,
    name,
    ...(category ? { category } : {}),
    ...(type ? { type } : {}),
    ...(currentValue !== undefined ? { currentValue } : {}),
    choices: flattenChoices(rec.options)
  })
  return parsed.success ? parsed.data : null
}

function flattenChoices(raw: unknown): SessionConfigChoice[] {
  if (!Array.isArray(raw)) return []
  const out: SessionConfigChoice[] = []
  for (const item of raw) {
    const rec = asRecord(item)
    if (Array.isArray(rec.options)) {
      out.push(...flattenChoices(rec.options))
      continue
    }
    const value = String(rec.value ?? "").trim()
    const name = String(rec.name ?? value).trim()
    if (value && name) out.push({ value, name })
  }
  return out
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
