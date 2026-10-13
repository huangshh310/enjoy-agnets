/**
 * 红卡展示用脱敏：去本机路径、密钥样 token，压成一行并限长（leo #151）。
 * 只在展示时调用；store.error 存原文，classifyThreadError / 重试都认原文。
 */
import { humanizeThreadError } from "./classify-thread-error.ts"

/** 红卡上最多显示这么多字；更长的截断加省略号。 */
export const THREAD_ERROR_MAX_CHARS = 240

/** 去掉本机路径、密钥样的 token，压成一行并限长。 */
export function redactThreadError(raw: string): string {
  let text = raw
    .replace(/\b(sk|pk|rk|ghp|gho|ghs|xox[abprs]|AKIA)[-_A-Za-z0-9]{8,}/g, "[已隐藏]")
    .replace(/\b(Bearer|token|api[_-]?key|secret|password)(\s*[:=]\s*|\s+)[^\s,;'"]+/gi, "$1$2[已隐藏]")
    .replace(/[A-Za-z]:\\+(?:[^\\\s:*?"<>|]+\\+)*[^\\\s:*?"<>|]*/g, "[路径]")
    .replace(/(?:~|\/(?:Users|home|private|var|tmp|opt|etc|root|Volumes|mnt|workspace))(?:\/[^\s:'"),]+)+/g, "[路径]")
    .replace(/\s+/g, " ")
    .trim()
  const chars = Array.from(text)
  if (chars.length > THREAD_ERROR_MAX_CHARS) text = `${chars.slice(0, THREAD_ERROR_MAX_CHARS).join("")}…`
  return text
}


type Translate = Parameters<typeof humanizeThreadError>[1]

/** 红卡正文的生产路径：先按原文人话化（分类认原文），再脱敏展示。 */
export function displayThreadErrorText(error: string, t: Translate): string {
  return redactThreadError(humanizeThreadError(error, t))
}
