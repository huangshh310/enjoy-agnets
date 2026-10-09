/**
 * 密钥映射：空值表示保留已存，回传只给键不给值。
 */

export function parseStringMap(raw?: string | null): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") out[key] = value
    }
    return out
  } catch {
    return undefined
  }
}

/** incoming 缺席则保留 existing；键在 incoming 且值为空则保留旧值。 */
export function mergeKeptSecrets(
  incoming: Record<string, string> | undefined,
  existing: Record<string, string> | undefined
): Record<string, string> {
  if (!incoming) return { ...existing }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(incoming)) {
    if (value.trim()) {
      out[key] = value
      continue
    }
    const previous = existing?.[key]
    if (previous != null && previous !== "") out[key] = previous
  }
  return out
}

export function redactSecretMap(env: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.keys(env).map((key) => [key, ""]))
}

export function mergeJsonSecrets(incoming: string | undefined, existing: string | undefined): string | undefined {
  if (incoming == null || !incoming.trim()) return existing
  const parsedIncoming = parseStringMap(incoming)
  if (!parsedIncoming) return existing
  const merged = mergeKeptSecrets(parsedIncoming, parseStringMap(existing))
  return Object.keys(merged).length > 0 ? JSON.stringify(merged) : undefined
}

export function redactJsonSecrets(raw?: string): string | undefined {
  const parsed = parseStringMap(raw)
  if (!parsed || Object.keys(parsed).length === 0) return undefined
  return JSON.stringify(redactSecretMap(parsed))
}
