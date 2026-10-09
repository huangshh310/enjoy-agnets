/**
 * Esc 关 @ 面板时连触发符一起剥掉，避免输入框留下裸 @。
 */
import { replaceMentionToken, type ActiveMention } from "./composer-token.ts"

export function dismissMentionValue(value: string, mention: ActiveMention | null): string {
  if (!mention) return value
  return replaceMentionToken(value, mention, "")
}
