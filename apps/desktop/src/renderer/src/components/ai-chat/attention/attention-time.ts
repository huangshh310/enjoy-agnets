/**
 * 胶囊相对时间。复用收件箱分档，词条走 attention.time。
 */
import { inboxTimeParts } from "@renderer/components/inbox/lib/inbox-time"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function attentionTimeLabel(occurredAt: number, now: number, t: Translate): string {
  const parts = inboxTimeParts(occurredAt, now)
  if (parts.key === "justNow") return t("attention.time.justNow")
  return t(`attention.time.${parts.key}`, { n: parts.n })
}
