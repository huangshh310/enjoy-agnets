/**
 * 收件箱行 / 阅读器共用的分类与相对时间文案。
 */
import type { ComponentType } from "react"
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiPlayCircleLine,
  RiQuestionLine,
  RiShieldKeyholeLine,
  RiStopCircleLine
} from "@remixicon/react"
import type { InboxGroupId, InboxKind } from "../inbox.types"
import { inboxTimeParts } from "../lib/inbox-time"

type Translate = (path: string, vars?: Record<string, string | number>) => string

export function inboxCategoryLabel(kind: InboxKind, t: Translate): string {
  return kind === "agent" ? t("pages.inbox.categoryAgent") : t("pages.inbox.categorySystem")
}

export function inboxTimeLabel(occurredAt: number, now: number, t: Translate): string {
  const parts = inboxTimeParts(occurredAt, now)
  if (parts.key === "justNow") return t("pages.inbox.justNow")
  return t(`pages.inbox.${parts.key}`, { n: parts.n })
}

export function inboxGroupLabel(id: InboxGroupId, t: Translate): string {
  if (id === "today") return t("pages.inbox.groupToday")
  if (id === "yesterday") return t("pages.inbox.groupYesterday")
  return t("pages.inbox.groupEarlier")
}

export interface InboxTheme {
  badgeBg: string
  badgeText: string
  badgeBorder: string
  badgeDot: string
  badgeLabel: string
  icon: ComponentType<{ className?: string }>
}

export function getInboxTheme(copyKey: string, t: Translate): InboxTheme {
  switch (copyKey) {
    case "complete":
      return {
        badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        badgeText: "text-emerald-600 dark:text-emerald-400",
        badgeBorder: "border-emerald-500/25",
        badgeDot: "bg-emerald-500",
        badgeLabel: t("pages.inbox.navComplete") || "已完成",
        icon: RiCheckboxCircleLine
      }
    case "error":
      return {
        badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
        badgeText: "text-rose-600 dark:text-rose-400",
        badgeBorder: "border-rose-500/25",
        badgeDot: "bg-rose-500",
        badgeLabel: t("pages.inbox.navFailed") || "失败",
        icon: RiErrorWarningLine
      }
    case "pending_approval":
      return {
        badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
        badgeText: "text-amber-600 dark:text-amber-400",
        badgeBorder: "border-amber-500/25",
        badgeDot: "bg-amber-500",
        badgeLabel: t("pages.inbox.navWaiting") || "等你审批",
        icon: RiShieldKeyholeLine
      }
    case "ask_user":
      return {
        badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
        badgeText: "text-amber-600 dark:text-amber-400",
        badgeBorder: "border-amber-500/25",
        badgeDot: "bg-amber-500",
        badgeLabel: t("attention.kind.ask_user") || "待回答",
        icon: RiQuestionLine
      }
    case "running":
      return {
        badgeBg: "bg-accent-500/10 dark:bg-accent-500/15",
        badgeText: "text-accent-600 dark:text-accent-400",
        badgeBorder: "border-accent-500/25",
        badgeDot: "bg-accent-500",
        badgeLabel: t("pages.inbox.navRunning") || "运行中",
        icon: RiPlayCircleLine
      }
    case "aborted":
      return {
        badgeBg: "bg-neutral-500/10 dark:bg-neutral-500/15",
        badgeText: "text-text-secondary",
        badgeBorder: "border-neutral-500/25",
        badgeDot: "bg-neutral-400",
        badgeLabel: t("pages.inbox.badgeAborted") || "已取消",
        icon: RiStopCircleLine
      }
    default:
      return {
        badgeBg: "bg-background-secondary-default",
        badgeText: "text-text-secondary",
        badgeBorder: "border-separator-border",
        badgeDot: "bg-text-tertiary",
        badgeLabel: t("pages.inbox.navAll") || "消息",
        icon: RiCheckboxCircleLine
      }
  }
}
