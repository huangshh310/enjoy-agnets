/**
 * 心跳表单草稿。切会话时先清空，再按该会话的行填回来。
 */
import { SessionHeartbeat } from "@enjoy-agents/ipc-contract/session-heartbeat"

export type HeartbeatDraft = {
  cronExpr: string
  timeZone: string
  prompt: string
  maxRuns: string
  active: boolean
  paused: boolean
}

export function emptyHeartbeatDraft(): HeartbeatDraft {
  return {
    cronExpr: "0 9 * * *",
    timeZone: defaultHeartbeatTimeZone(),
    prompt: "",
    maxRuns: "",
    active: false,
    paused: false
  }
}

function defaultHeartbeatTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  } catch {
    return ""
  }
}

/** 没有行就回到空草稿。停用的行仍算存在，好让「停止」删掉它。 */
export function draftFromHeartbeat(raw: unknown): HeartbeatDraft {
  const parsed = SessionHeartbeat.safeParse(raw)
  if (!parsed.success) return emptyHeartbeatDraft()
  return {
    cronExpr: parsed.data.cronExpr,
    timeZone: parsed.data.timeZone,
    prompt: parsed.data.prompt,
    maxRuns: parsed.data.maxRuns == null ? "" : String(parsed.data.maxRuns),
    active: true,
    paused: !parsed.data.enabled
  }
}

export function parseHeartbeatMaxRuns(raw: string): number | null | "invalid" {
  const text = raw.trim()
  if (!text) return null
  const cap = Number(text)
  if (!Number.isInteger(cap) || cap < 1) return "invalid"
  return cap
}
