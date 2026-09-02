/**
 * 点分路径取文案，并用 {name} 插值。缺键时返回路径本身，避免空白。
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key]
    return value == null ? `{${key}}` : String(value)
  })
}

export function lookup(messages: unknown, path: string): string {
  let current: unknown = messages
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return path
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === "string" ? current : path
}

export function translate(
  messages: unknown,
  path: string,
  vars?: Record<string, string | number>
): string {
  return interpolate(lookup(messages, path), vars)
}

export function flattenMessageKeys(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return prefix ? [prefix] : []
  if (typeof node !== "object" || node === null) return []
  return Object.entries(node).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key
    return flattenMessageKeys(value, next)
  })
}
