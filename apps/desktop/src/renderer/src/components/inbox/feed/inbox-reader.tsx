import { useEffect, useMemo, useState } from "react"
import {
  RiArrowRightLine,
  RiArrowRightUpLine,
  RiCheckLine,
  RiErrorWarningFill,
  RiFileCopyLine,
  RiFolderLine,
  RiInboxLine,
  RiLoader4Line,
  RiMailUnreadLine,
  RiShieldCheckFill,
  RiShieldCheckLine,
  RiStopCircleLine,
  RiTerminalBoxLine,
  RiToolsLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cx } from "@/utils/cx"
import { useI18n, useT } from "@renderer/i18n"
import { formatInboxOccurredAt } from "../lib/format-inbox-occurred-at"
import { toolArgsOf, toolDisplayPhrase } from "@renderer/lib/tool-display-name"
import { getIde, hasIde } from "@renderer/lib/ide"
import { MarkdownResponse } from "@renderer/components/ai-chat/thread/markdown-response"
import { parseAssistantPayload } from "@enjoy-agents/ipc-contract"
import type { InboxNotification } from "../inbox.types"
import { getInboxTheme, inboxTimeLabel } from "./inbox-copy"

interface SessionMessageRow {
  id: string
  role: string
  content: string
  parts?: unknown[]
}

export function InboxReader(props: {
  item: InboxNotification | null
  now: number
  onToggleRead: (id: string) => void
  onOpenAction: (item: InboxNotification) => void
}) {
  const t = useT()
  const { locale } = useI18n()
  const { item, now, onToggleRead, onOpenAction } = props
  const [copiedId, setCopiedId] = useState(false)
  const [sessionMessages, setSessionMessages] = useState<SessionMessageRow[] | null>(null)

  useEffect(() => {
    if (!item?.sessionId || !hasIde()) {
      setSessionMessages(null)
      return
    }
    let cancelled = false
    void getIde()
      .session.messages({ sessionId: item.sessionId })
      .then((msgs) => {
        if (!cancelled) {
          setSessionMessages(msgs as SessionMessageRow[])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionMessages(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [item?.sessionId])

  function handleCopySessionId() {
    if (!item?.sessionId) return
    void navigator.clipboard.writeText(item.sessionId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 1500)
  }

  const { latestAssistantText, toolsSummary, thoughtSeconds } = useMemo(() => {
    if (!sessionMessages || sessionMessages.length === 0) {
      return { latestAssistantText: null, toolsSummary: null, thoughtSeconds: null }
    }

    const lastAssistant = sessionMessages.filter((m) => m.role === "assistant").at(-1)
    if (!lastAssistant) {
      return { latestAssistantText: null, toolsSummary: null, thoughtSeconds: null }
    }

    const parsed = parseAssistantPayload(lastAssistant.content)
    const assistantText = parsed.content.trim() || null
    const phrases = (parsed.tools ?? [])
      .filter((tool) => tool.name)
      .map((tool) => {
        const args = toolArgsOf(tool) ?? (tool.name === item?.toolName ? item.toolArgs : undefined)
        return toolDisplayPhrase(tool.name, t, args)
      })

    return {
      latestAssistantText: assistantText,
      toolsSummary: phrases.length > 0 ? Array.from(new Set(phrases)).join("、") : null,
      thoughtSeconds: parsed.thoughtSeconds ?? null
    }
  }, [item?.toolArgs, item?.toolName, sessionMessages, t])

  if (!item) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background-primary-default">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-separator-border/70 px-6 bg-background-primary-default" />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center bg-background-primary-default">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-separator-border/60 bg-background-secondary-default/50 text-foreground-icon-tertiary mb-4 shadow-2xs">
            <RiInboxLine className="size-7" />
          </div>
          <h3 className="text-title-3-semibold text-text-primary">
            {t("pages.inbox.readerEmpty")}
          </h3>
          <p className="mt-1.5 max-w-sm text-caption-1-regular text-text-secondary leading-relaxed">
            {t("pages.inbox.readerEmptyHint")}
          </p>
        </div>
      </div>
    )
  }

  const theme = getInboxTheme(item.copyKey, t)
  const ThemeIcon = theme.icon
  const relativeTime = inboxTimeLabel(item.occurredAt, now, t)
  const fullTime = formatInboxOccurredAt(item.occurredAt, locale)
  const displayTitle = item.sessionTitle || item.title || t("chat.untitledSession")
  const displayWorkspace =
    item.workspaceName ||
    (item.workspaceId?.startsWith("ws_") ? t("pages.inbox.localWorkspace") : item.workspaceId) ||
    t("pages.inbox.localWorkspace")

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background-primary-default">
      {/* 顶部工具栏：状态徽标 + 工作区 + 发生时间 + 右侧操作 */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-separator-border/70 px-6 bg-background-primary-default">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption-2-medium font-medium border shrink-0",
              theme.badgeBg,
              theme.badgeText,
              theme.badgeBorder
            )}
          >
            <ThemeIcon className="size-3.5 shrink-0" />
            <span>{theme.badgeLabel}</span>
          </span>
          {displayWorkspace ? (
            <>
              <span className="text-text-tertiary">·</span>
              <span
                className="inline-flex items-center gap-1 text-caption-2-regular text-text-tertiary truncate max-w-[220px]"
                title={displayWorkspace}
              >
                <RiFolderLine className="size-3 shrink-0" />
                <span className="truncate">{displayWorkspace}</span>
              </span>
            </>
          ) : null}
          <span className="text-text-tertiary">·</span>
          <time
            className="text-caption-1-regular text-text-tertiary font-mono truncate"
            dateTime={new Date(item.occurredAt).toISOString()}
          >
            {fullTime} ({relativeTime})
          </time>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleRead(item.id)}
            className="gap-1.5 h-8 text-caption-2-medium cursor-pointer"
          >
            {item.read ? (
              <>
                <RiMailUnreadLine className="size-3.5" />
                <span>{t("pages.inbox.markUnread")}</span>
              </>
            ) : (
              <>
                <RiCheckLine className="size-3.5" />
                <span>{t("pages.inbox.markRead")}</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenAction(item)}
            className="gap-1.5 h-8 text-caption-2-medium shadow-xs cursor-pointer"
          >
            <RiArrowRightUpLine className="size-3.5" />
            <span>{item.actionLabel || t("pages.inbox.actions.openSession")}</span>
          </Button>
        </div>
      </header>

      {/* 主体卡片内容 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto max-w-3xl px-8 py-7 flex flex-col gap-6">
          {/* 任务标题 & 会话 ID */}
          <div className="flex flex-col gap-2 border-b border-separator-border/60 pb-5">
            <h2 className="text-title-2-semibold text-text-primary tracking-tight leading-snug">
              {displayTitle}
            </h2>
            <div className="flex items-center gap-2 text-caption-2-regular text-text-tertiary">
              <RiTerminalBoxLine className="size-3.5 text-text-tertiary" />
              <button
                type="button"
                onClick={handleCopySessionId}
                className="inline-flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                title={t("pages.inbox.copySessionId")}
              >
                {copiedId ? (
                  <>
                    <RiCheckLine className="size-3 text-state-success-text" />
                    <span className="text-state-success-text">{t("pages.inbox.copiedSessionId")}</span>
                  </>
                ) : (
                  <>
                    <RiFileCopyLine className="size-3" />
                    <span>{t("pages.inbox.copySessionId")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 待审批提示卡 */}
          {item.copyKey === "pending_approval" || item.copyKey === "ask_user" ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-status-yellow-text/30 bg-status-yellow-background/10 p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-status-yellow-text dark:text-status-yellow-text font-semibold text-caption-1-medium">
                  <RiShieldCheckFill className="size-4 shrink-0" />
                  <span>{t("pages.inbox.approvalCardTitle")}</span>
                </div>
                {item.toolName ? (
                  <span className="text-caption-2-semibold font-semibold px-2 py-0.5 rounded-md bg-status-yellow-background/20 border border-status-yellow-text/30 text-status-yellow-text dark:text-status-yellow-text">
                    {toolDisplayPhrase(item.toolName, t, item.toolArgs)}
                  </span>
                ) : null}
              </div>
              <p className="text-body-regular text-text-primary leading-relaxed">
                {item.summary}
              </p>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() => onOpenAction(item)}
                  className="gap-2 h-9 px-4 bg-status-yellow-background hover:bg-status-yellow-background text-white shadow-sm text-caption-1-medium cursor-pointer"
                >
                  <RiShieldCheckLine className="size-4" />
                  <span>{t("pages.inbox.openApprovalAction")}</span>
                  <RiArrowRightLine className="size-3.5 opacity-80" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* 已取消提示卡 */}
          {item.copyKey === "aborted" ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-separator-border bg-background-secondary-default/40 p-5">
              <div className="flex items-center gap-2 text-text-secondary font-semibold text-caption-1-medium">
                <RiStopCircleLine className="size-4 shrink-0 text-text-tertiary" />
                <span>{t("pages.inbox.abortedCardTitle")}</span>
              </div>
              <p className="text-caption-1-regular text-text-secondary leading-relaxed">
                {t("pages.inbox.abortedCardHint")}
              </p>
            </div>
          ) : null}

          {/* 失败提示卡 */}
          {item.copyKey === "error" ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border-error-default/25 bg-background-tertiary-error/5 p-5">
              <div className="flex items-center gap-2 text-text-error-primary dark:text-text-error-primary font-semibold text-caption-1-medium">
                <RiErrorWarningFill className="size-4 shrink-0" />
                <span>{t("pages.inbox.errorCardTitle")}</span>
              </div>
              <pre className="font-mono text-caption-1-regular bg-background-primary-default/90 p-3.5 rounded-xl border border-border-error-default/20 text-text-error-primary dark:text-text-error-primary whitespace-pre-wrap select-all leading-relaxed">
                {item.errorMessage || item.summary}
              </pre>
            </div>
          ) : null}

          {/* 运行中提示卡 */}
          {item.copyKey === "running" ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-accent-500/25 bg-accent-500/5 p-5">
              <div className="flex items-center gap-2 text-accent-700 dark:text-accent-300 font-semibold text-caption-1-medium">
                <RiLoader4Line className="size-4 shrink-0 animate-spin" />
                <span>{t("pages.inbox.runningCardTitle")}</span>
              </div>
              <p className="text-body-regular text-text-secondary leading-relaxed">
                {item.summary || t("chat.sessionActive")}
              </p>
            </div>
          ) : null}

          {/* 执行指标轻量条（调用工具 / 思考时长） */}
          {toolsSummary || thoughtSeconds ? (
            <div className="flex items-center gap-3 text-caption-2-medium text-text-tertiary px-1">
              {toolsSummary ? (
                <span className="inline-flex items-center gap-1">
                  <RiToolsLine className="size-3.5 text-text-tertiary" />
                  <span>{t("pages.inbox.toolsCalled", { names: toolsSummary })}</span>
                </span>
              ) : null}
              {thoughtSeconds ? (
                <span>{t("pages.inbox.thoughtSecondsWithApproval", { n: thoughtSeconds })}</span>
              ) : null}
            </div>
          ) : null}

          {/* 智能体回答正文（经 parseAssistantPayload 解析后的纯净 Markdown） */}
          {latestAssistantText ? (
            <div className="flex flex-col gap-3 pt-1">
              <div className="prose-container min-h-0 text-text-primary text-body-regular leading-relaxed">
                <MarkdownResponse>{latestAssistantText}</MarkdownResponse>
              </div>
            </div>
          ) : item.summary &&
            item.summary !== displayTitle &&
            !item.isAborted &&
            item.copyKey !== "error" &&
            item.copyKey !== "pending_approval" &&
            item.copyKey !== "ask_user" ? (
            <div className="text-body-regular text-text-secondary leading-relaxed">
              {item.summary}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}
