/**
 * 审批卡挂在别的对话上、被拒批时的中性提示（luna 定稿）。
 * 存进 store.notice 的是带前缀的码（再带上那个对话的标题），画的时候按界面语言翻译——切语言也对。
 */
import { isDefaultSessionTitle } from "@enjoy-agents/ipc-contract/session-title"

export const APPROVAL_OTHER_CHAT_NOTICE = "approval_other_chat:"
/** 标题最多显示多少个字，再长截断加「…」。 */
export const APPROVAL_OTHER_CHAT_TITLE_MAX = 20

type Translate = (path: string, vars?: Record<string, string | number>) => string

/** 截到 max 个字（按码点，不劈开 emoji / 生僻字）再加「…」。空 / 占位题（新对话）返回 null，走不带标题的文案。 */
export function approvalOtherChatTitle(raw: string | null | undefined, max = APPROVAL_OTHER_CHAT_TITLE_MAX): string | null {
  const title = (raw ?? "").replace(/\s+/g, " ").trim()
  if (!title || isDefaultSessionTitle(title)) return null
  const chars = Array.from(title)
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : title
}

export function approvalOtherChatNotice(rawTitle: string | null | undefined): string {
  return APPROVAL_OTHER_CHAT_NOTICE + (approvalOtherChatTitle(rawTitle) ?? "")
}

/** 是这条提示就返回 { title }（没有标题时 title 为 null），否则 null。 */
export function parseApprovalOtherChatNotice(notice: string | null | undefined): { title: string | null } | null {
  if (!notice?.startsWith(APPROVAL_OTHER_CHAT_NOTICE)) return null
  return { title: notice.slice(APPROVAL_OTHER_CHAT_NOTICE.length) || null }
}

export function approvalOtherChatText(t: Translate, title: string | null): string {
  return title ? t("chat.approvalBelongsToOtherChatTitled", { title }) : t("chat.approvalBelongsToOtherChat")
}
