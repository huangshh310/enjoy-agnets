/**
 * 本机 CLI 对接版本：比较当前与 Enjoy 最低要求。
 * 未知版本不警告；低于要求才 outdated，禁止假就绪。
 */
export const CLI_MIN_COMPATIBLE: Readonly<Partial<Record<string, string>>> = {
  cursor: "2025.08.01",
  claude: "1.0.0",
  grok: "0.1.0",
  codex: "0.20.0",
  antigravity: "0.1.0",
  gemini: "0.1.0",
  opencode: "0.1.0",
  pi: "0.1.0",
  omp: "0.1.0",
  hermes: "0.1.0",
  amp: "0.1.0",
  deepseek: "0.1.0"
}

export type CliCompatKind = "ok" | "outdated" | "unknown"

export type CliCompatView = {
  kind: CliCompatKind
  current: string
  required: string
}

/** Enjoy 对接最低版本；Enjoy Local / 自定义没有。 */
export function requiredVersionFor(id: string | undefined): string | null {
  if (!id) return null
  return CLI_MIN_COMPATIBLE[id] ?? null
}

export function resolveCliCompat(input: {
  version?: string | null
  cliVersion?: string | null
  requiredVersion?: string | null
}): CliCompatView {
  const required = input.requiredVersion?.trim() || ""
  const current = firstVersion(input.version, input.cliVersion)
  if (!required || !current) {
    return {
      kind: "unknown",
      current: formatCliVersion(current),
      required: formatRequiredVersion(required)
    }
  }
  const cmp = compareCliVersions(current, required)
  if (cmp === "below") {
    return {
      kind: "outdated",
      current: formatCliVersion(current),
      required: formatRequiredVersion(required)
    }
  }
  if (cmp === "ok") {
    return {
      kind: "ok",
      current: formatCliVersion(current),
      required: formatRequiredVersion(required)
    }
  }
  return {
    kind: "unknown",
    current: formatCliVersion(current),
    required: formatRequiredVersion(required)
  }
}

/** C 端短版本：v1.2 / v2026.09.02。解析不了写 —。 */
export function formatCliVersion(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—"
  const hit = raw.trim().match(/v?\d+(?:\.\d+){0,3}/i)
  if (!hit) return "—"
  return /^v/i.test(hit[0]) ? hit[0] : `v${hit[0]}`
}

/** 「要 ≥1.5」不带 v，对齐预览。 */
export function formatRequiredVersion(raw: string | null | undefined): string {
  const formatted = formatCliVersion(raw)
  return formatted === "—" ? "—" : formatted.replace(/^v/i, "")
}

export function compareCliVersions(
  current: string,
  required: string
): "below" | "ok" | "unknown" {
  const left = parseCliVersion(current)
  const right = parseCliVersion(required)
  if (!left || !right) return "unknown"
  const len = Math.max(left.length, right.length)
  for (let i = 0; i < len; i += 1) {
    const a = left[i] ?? 0
    const b = right[i] ?? 0
    if (a < b) return "below"
    if (a > b) return "ok"
  }
  return "ok"
}

function parseCliVersion(raw: string): number[] | null {
  const hit = raw.trim().match(/v?(\d+(?:\.\d+){0,3})/i)
  if (!hit?.[1]) return null
  const parts = hit[1].split(".").map((item) => Number(item))
  if (parts.some((item) => !Number.isFinite(item))) return null
  return parts
}

function firstVersion(...candidates: Array<string | null | undefined>): string {
  for (const item of candidates) {
    if (item?.trim()) return item.trim()
  }
  return ""
}
