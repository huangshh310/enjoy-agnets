/**
 * session/list 分页解析。
 */
export type AcpListedSession = {
  sessionId: string
  cwd: string
  title?: string
  updatedAt?: string
}

export async function fetchAcpSessionPages(
  request: (method: string, params: unknown) => Promise<unknown>,
  cwd: string
): Promise<AcpListedSession[]> {
  const sessions: AcpListedSession[] = []
  let cursor: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const result = asRecord(await request("session/list", cursor ? { cwd, cursor } : { cwd }))
    const rows = Array.isArray(result.sessions) ? result.sessions : []
    for (const row of rows) {
      const parsed = parseListedRow(row)
      if (parsed) sessions.push(parsed)
    }
    const next = typeof result.nextCursor === "string" ? result.nextCursor.trim() : ""
    if (!next) break
    cursor = next
  }
  return sessions
}

function parseListedRow(raw: unknown): AcpListedSession | null {
  const rec = asRecord(raw)
  const sessionId = String(rec.sessionId ?? "").trim()
  const cwd = String(rec.cwd ?? "").trim()
  if (!sessionId || !cwd) return null
  const title = typeof rec.title === "string" ? rec.title.trim() : ""
  const updatedAt = typeof rec.updatedAt === "string" ? rec.updatedAt : ""
  return {
    sessionId,
    cwd,
    ...(title ? { title } : {}),
    ...(updatedAt ? { updatedAt } : {})
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
