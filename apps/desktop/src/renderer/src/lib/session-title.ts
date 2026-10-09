/**
 * 会话题：占位/乐观规则在 ipc-contract；这里只留 sanitize。
 */
import { isDefaultSessionTitle } from "@enjoy-agents/ipc-contract/session-title"

export {
  DEFAULT_SESSION_TITLES,
  formatOptimisticTitle,
  isDefaultSessionTitle,
  shouldRefineSessionTitle,
  stripTitleSource
} from "@enjoy-agents/ipc-contract/session-title"

/** 占位题按界面语言显示，不把种子里的 New agent 摊给中文用户。 */
export function displaySessionTitle(title: string | null | undefined, placeholder: string): string {
  const trimmed = title?.trim() ?? ""
  return !trimmed || isDefaultSessionTitle(trimmed) ? placeholder : trimmed
}

export function sanitizeTitle(raw: string): string {
  return raw
    .replace(/^["'《「『\s]+|["'》」』\s]+$/g, "")
    .replace(/^(Title|Topic|会话标题|标题)[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .trim()
}
