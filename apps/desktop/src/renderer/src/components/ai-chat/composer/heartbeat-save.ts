/**
 * 保存会替换这一条并清零次数。停止是删行。
 */
import type { TranslateFn } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"
import { parseHeartbeatMaxRuns, type HeartbeatDraft } from "./heartbeat-draft"

export async function saveHeartbeat(
  sessionId: string,
  draft: HeartbeatDraft,
  t: TranslateFn
): Promise<string | null> {
  const prompt = draft.prompt.trim()
  const maxRuns = parseHeartbeatMaxRuns(draft.maxRuns)
  if (!prompt || maxRuns === "invalid") return t("chat.heartbeatInvalid")
  try {
    await getIde().session.heartbeatPut({
      sessionId,
      cronExpr: draft.cronExpr.trim(),
      timeZone: draft.timeZone.trim() || undefined,
      prompt,
      maxRuns
    })
    return null
  } catch {
    return t("chat.heartbeatFailed")
  }
}

export async function stopHeartbeat(sessionId: string, t: TranslateFn): Promise<string | null> {
  try {
    await getIde().session.heartbeatClear({ sessionId })
    return null
  } catch {
    return t("chat.heartbeatFailed")
  }
}
