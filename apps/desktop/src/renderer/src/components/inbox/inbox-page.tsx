/**
 * 安静 Inbox：筛选只有拍板 / 待验收 / 失败。徽标=拍板数。
 */
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { RiErrorWarningLine, RiEyeLine, RiShieldCheckLine } from "@remixicon/react"
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
        approvalCount={inbox.approvalCount}
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
  if (filter === "needs_review") return t("pages.inbox.navNeedsReview")
  if (filter === "failed") return t("pages.inbox.navFailed")
  return t("pages.inbox.navApproval")
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
        {
          id: "approval",
          label: t("pages.inbox.navApproval"),
          icon: RiShieldCheckLine,
          meta: badge(counts.approval)
        },
        {
          id: "needs_review",
          label: t("pages.inbox.navNeedsReview"),
          icon: RiEyeLine,
          meta: badge(counts.needs_review)
        },
        {
          id: "failed",
          label: t("pages.inbox.navFailed"),
          icon: RiErrorWarningLine,
          meta: badge(counts.failed)
        }
      ]
    }
  ]
}
