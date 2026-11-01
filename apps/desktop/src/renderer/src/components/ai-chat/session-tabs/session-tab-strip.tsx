/**
 * 会话级顶栏标签条（短锁）：名缩短 + 忙/等你点 + ×。窄窗横滑。
 * 不做并排分屏 / editor group。
 */
import { useT } from "@renderer/i18n"
import { displaySessionTitle } from "@renderer/lib/session-title"
import { useChatStore } from "@renderer/stores/chat-store"
import { useSessionTabsStore } from "@renderer/stores/session-tabs-store"
import { useSessionActivity } from "@renderer/components/ai-chat/sidebar/use-session-activity"
import {
  SESSION_TAB_BUSY_LABEL,
  SESSION_TAB_WAIT_LABEL
} from "@renderer/hooks/session-tabs/session-tabs-logic"
import {
  beginCloseSessionTab,
  cancelCloseSessionTab,
  confirmCloseSessionTabDiscard,
  selectSessionTab
} from "@renderer/hooks/session-tabs/session-tabs-actions"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { cx } from "@/utils/cx"

export function SessionTabStrip() {
  const t = useT()
  const tabIds = useSessionTabsStore((s) => s.tabIds)
  const pendingCloseId = useSessionTabsStore((s) => s.pendingCloseId)
  const sessionId = useChatStore((s) => s.sessionId)
  const repositories = useChatStore((s) => s.repositories)

  if (tabIds.length === 0) return null

  return (
    <>
      <div
        data-testid="session-tab-strip"
        role="tablist"
        aria-label={t("chat.sessionTabs.label")}
        className="flex min-h-9 min-w-0 shrink-0 items-stretch overflow-x-auto border-b border-separator-border bg-background-secondary-default [scrollbar-width:thin]"
      >
        {tabIds.map((id) => {
          const node = repositories.find((row) => row.id === id && row.kind === "session")
          const name = node?.name ?? id
          const label = displaySessionTitle(name, t("chat.newAgent"))
          const active = sessionId === id
          return (
            <SessionTabChip
              key={id}
              sessionId={id}
              label={label}
              active={active}
              onSelect={() => void selectSessionTab(id)}
              onClose={() => void beginCloseSessionTab(id)}
            />
          )
        })}
      </div>
      <ConfirmDialog
        open={pendingCloseId != null}
        title={t("chat.sessionTabs.draftConfirm")}
        description={t("chat.sessionTabs.draftConfirmHint")}
        confirmLabel={t("chat.sessionTabs.discard")}
        cancelLabel={t("chat.sessionTabs.keep")}
        destructive
        onOpenChange={(open) => {
          if (!open) cancelCloseSessionTab()
        }}
        onConfirm={() => void confirmCloseSessionTabDiscard()}
      />
    </>
  )
}

function SessionTabChip({
  sessionId,
  label,
  active,
  onSelect,
  onClose
}: {
  sessionId: string
  label: string
  active: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const activity = useSessionActivity(sessionId)
  const wait = activity.waitingReview
  const busy = activity.running && !wait
  const dotTitle = wait ? SESSION_TAB_WAIT_LABEL : busy ? SESSION_TAB_BUSY_LABEL : undefined

  return (
    <div
      role="tab"
      aria-selected={active}
      data-testid="session-tab"
      data-session-id={sessionId}
      data-active={active ? "true" : "false"}
      className={cx(
        "group relative flex max-w-[11.25rem] shrink-0 items-center gap-1.5 border-r border-separator-border px-3 py-2 text-left",
        active
          ? "bg-background-primary-default text-text-primary shadow-[inset_0_0_0_2px_rgba(43,109,229,0.3)]"
          : "text-text-secondary hover:bg-background-primary-default/80"
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        onClick={onSelect}
        title={label}
      >
        <span
          className={cx(
            "size-1.5 shrink-0 rounded-full",
            wait ? "bg-chart-warning" : busy ? "bg-accent-500" : "bg-background-tertiary-default"
          )}
          title={dotTitle}
          aria-label={dotTitle}
        />
        <span
          className={cx(
            "truncate text-caption-1-medium",
            active ? "font-semibold text-text-primary" : "font-medium text-text-secondary"
          )}
        >
          {label}
        </span>
      </button>
      <button
        type="button"
        data-testid="session-tab-close"
        title="关闭标签"
        aria-label="关闭标签"
        className={cx(
          "grid size-4 shrink-0 place-items-center rounded text-caption-2-regular text-text-secondary",
          "opacity-0 hover:bg-background-secondary-hover group-hover:opacity-60 hover:!opacity-100",
          active && "opacity-60"
        )}
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        ×
      </button>
    </div>
  )
}
