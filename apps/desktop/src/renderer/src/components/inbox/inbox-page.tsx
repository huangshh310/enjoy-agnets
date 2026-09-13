/**
 * 消息中心：左右分栏阅读，分类过滤与跳转。
 */
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiInboxLine,
  RiMailUnreadLine,
  RiPlayCircleLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { useT } from "@renderer/i18n"
import { InboxLayout } from "./feed/inbox-layout"
import type { InboxCategory, InboxNavCounts, InboxNotification } from "./inbox.types"
import { openInboxAction } from "./lib/open-inbox-action"
import { useInbox } from "./use-inbox"

export function InboxPage() {
  const t = useT()
  const navigate = useNavigate()
  const inbox = useInbox()
  const navGroups = useMemo(() => buildInboxNav(t, inbox.counts), [inbox.counts, t])

  function handleOpenAction(item: InboxNotification) {
    if (item.actionKey) {
      openInboxAction(navigate, item.actionKey, item.sessionId, item.workspaceId, item.copyKey)
    }
  }

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.inbox.searchPlaceholder")}
      groups={navGroups}
      selectedId={inbox.filter}
      onSelect={(id) => inbox.setFilter(id as InboxCategory)}
      contentWidth="fill"
      searchValue={inbox.search}
      onSearchChange={inbox.setSearch}
      filterNav={false}
      breadcrumbTitle={navLabel(inbox.filter, t)}
      hideChrome
    >
      <InboxLayout
        groups={inbox.groups}
        selected={inbox.selected}
        now={inbox.now}
        unreadCount={inbox.unreadCount}
        hasRead={inbox.hasRead}
        onSelect={inbox.selectItem}
        onToggleRead={inbox.toggleRead}
        onOpenAction={handleOpenAction}
        onMarkAllRead={inbox.markAllRead}
        onClearRead={inbox.clearRead}
      />
    </SecondaryPageShell>
  )
}

function navLabel(filter: InboxCategory, t: (path: string) => string): string {
  if (filter === "unread") return t("pages.inbox.navUnread")
  if (filter === "running") return t("pages.inbox.navRunning")
  if (filter === "waiting") return t("pages.inbox.navWaiting")
  if (filter === "failed") return t("pages.inbox.navFailed")
  if (filter === "complete") return t("pages.inbox.navComplete")
  return t("pages.inbox.navAll")
}

function badge(count: number): string | undefined {
  return count > 0 ? String(count) : undefined
}

function buildInboxNav(
  t: (path: string) => string,
  counts: InboxNavCounts
): SecondaryNavGroup[] {
  return [
    {
      id: "inbox_nav",
      label: t("pages.inbox.navGroup"),
      items: [
        { id: "all", label: t("pages.inbox.navAll"), icon: RiInboxLine, meta: badge(counts.all) },
        {
          id: "unread",
          label: t("pages.inbox.navUnread"),
          icon: RiMailUnreadLine,
          meta: badge(counts.unread)
        },
        {
          id: "running",
          label: t("pages.inbox.navRunning"),
          icon: RiPlayCircleLine,
          meta: badge(counts.running)
        },
        {
          id: "waiting",
          label: t("pages.inbox.navWaiting"),
          icon: RiShieldCheckLine,
          meta: badge(counts.waiting)
        },
        {
          id: "failed",
          label: t("pages.inbox.navFailed"),
          icon: RiErrorWarningLine,
          meta: badge(counts.failed)
        },
        {
          id: "complete",
          label: t("pages.inbox.navComplete"),
          icon: RiCheckboxCircleLine,
          meta: badge(counts.complete)
        }
      ]
    }
  ]
}
