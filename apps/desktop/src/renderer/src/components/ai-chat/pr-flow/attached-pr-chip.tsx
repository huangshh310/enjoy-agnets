/**
 * 会话挂 PR 芯片同簇：主芯片单击开 URL；旁⋯菜单；「盯着中」pill。
 * Must#6：禁第一下改盯 / +N 塞盯 / 第二套坞。
 */
import { useState } from "react"
import { RiGitPullRequestLine, RiMoreFill } from "@remixicon/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { requestOpenExternalQuiet } from "@renderer/lib/open-safe-external"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { useAttachedPrs } from "./use-attached-prs"
import { usePrBabysit } from "./use-pr-babysit"
import { BabysitStartConfirmDialog, BabysitStopConfirmDialog } from "./babysit-confirm-dialog"
import { ConnectGithubCard } from "./connect-github-card"

export function AttachedPrChip(props: {
  sessionId: string | null
  className?: string
  compact?: boolean
}) {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const { primaryItem, extras, setPrimary } = useAttachedPrs(props.sessionId)
  const { isWatching, start, stop } = usePrBabysit(props.sessionId)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  if (!primaryItem) return null

  const watching = isWatching(primaryItem.number)

  function openUrl(url: string) {
    requestOpenExternalQuiet(url)
  }

  async function onConfirmStart() {
    if (!workspaceId || !props.sessionId) return
    setBusy(true)
    setStartError(null)
    try {
      const res = await start({
        workspaceId,
        number: primaryItem.number,
        url: primaryItem.url
      })
      if (!res.ok) {
        if (res.reason === "not-authed") {
          setStartOpen(false)
          setConnectOpen(true)
          return
        }
        setStartError(res.message || t("chat.prBabysitStartFailed"))
        return
      }
      setStartOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmStop() {
    setBusy(true)
    try {
      await stop(primaryItem.number)
      setStopOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const chip = (
    <button
      type="button"
      data-testid="attached-pr-chip"
      title={primaryItem.title || `PR #${primaryItem.number}`}
      onClick={(e) => {
        e.stopPropagation()
        void openUrl(primaryItem.url)
      }}
      className={cx(
        "inline-flex max-w-40 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-separator-border/80 bg-background-secondary-default/70 px-2 py-0.5 text-caption-2-medium text-text-secondary hover:border-accent-500/40 hover:text-accent-500",
        props.className
      )}
    >
      <RiGitPullRequestLine className="size-3 shrink-0" aria-hidden />
      <span className="truncate">
        {props.compact
          ? `#${primaryItem.number}`
          : t("chat.prAttachedChip", { n: primaryItem.number })}
      </span>
    </button>
  )

  // 侧栏 compact：只保留芯片（会话⋯为次入口）；完整簇在线程顶栏
  if (props.compact) {
    return (
      <div className="inline-flex min-w-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {chip}
        {watching ? (
          <span
            data-testid="attached-pr-watching-pill"
            className="inline-flex h-5 items-center rounded-full bg-success-50 px-1.5 text-caption-2-medium font-semibold text-success-700 ring-1 ring-success-200/80"
          >
            {t("chat.prBabysitWatching")}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="inline-flex min-w-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {chip}

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="attached-pr-overflow"
            aria-label={t("chat.prBabysitMenuLabel")}
            className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-separator-border/60 text-text-tertiary hover:border-accent-500/40 hover:text-accent-500"
          >
            <RiMoreFill className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          className="w-52 rounded-xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card"
        >
          <p className="px-2 py-1 text-caption-2-medium text-text-tertiary">
            {t("chat.prBabysitMenuTitle", { n: primaryItem.number })}
          </p>
          <button
            type="button"
            data-testid="attached-pr-menu-open"
            className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-caption-1-medium text-text-primary hover:bg-background-secondary-hover"
            onClick={() => {
              setMenuOpen(false)
              void openUrl(primaryItem.url)
            }}
          >
            {t("chat.prBabysitOpenPr")}
          </button>
          {watching ? (
            <button
              type="button"
              data-testid="attached-pr-menu-stop"
              className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-caption-1-medium font-semibold text-warning-700 hover:bg-warning-50"
              onClick={() => {
                setMenuOpen(false)
                setStopOpen(true)
              }}
            >
              {t("chat.prBabysitStopAction")}
            </button>
          ) : (
            <button
              type="button"
              data-testid="attached-pr-menu-start"
              className="flex w-full cursor-pointer items-center rounded-lg px-2.5 py-2 text-left text-caption-1-medium font-semibold text-accent-500 hover:bg-accent-50"
              onClick={() => {
                setMenuOpen(false)
                setStartError(null)
                setStartOpen(true)
              }}
            >
              {t("chat.prBabysitStartTitle")}
            </button>
          )}
        </PopoverContent>
      </Popover>

      {watching ? (
        <button
          type="button"
          data-testid="attached-pr-watching-pill"
          title={t("chat.prBabysitStopTitle")}
          onClick={() => setStopOpen(true)}
          className="inline-flex h-5 cursor-pointer items-center gap-1 rounded-full bg-success-50 px-2 text-caption-2-medium font-semibold text-success-700 ring-1 ring-success-200/80 hover:bg-success-100"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-success-600" aria-hidden />
          {t("chat.prBabysitWatching")}
        </button>
      ) : null}

      {extras.length > 0 ? (
        <Popover open={extrasOpen} onOpenChange={setExtrasOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="attached-pr-extras"
              className="inline-flex h-5 shrink-0 cursor-pointer items-center rounded-full border border-separator-border/60 px-1.5 text-caption-2-medium text-text-tertiary hover:border-accent-500/40 hover:text-accent-500"
            >
              +{extras.length}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            className="w-64 rounded-xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card"
          >
            <p className="px-2 py-1 text-caption-2-medium text-text-tertiary">
              {t("chat.prAttachedPanelTitle")}
            </p>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-caption-1-medium text-text-primary hover:bg-background-secondary-hover"
              onClick={() => void openUrl(primaryItem.url)}
            >
              <span className="font-mono text-accent-500">#{primaryItem.number}</span>
              <span className="min-w-0 flex-1 truncate">
                {primaryItem.title || t("chat.prPrimaryBadge")}
              </span>
            </button>
            {extras.map((item) => (
              <div key={item.number} className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-caption-1-medium text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                  onClick={() => void openUrl(item.url)}
                >
                  <span className="font-mono">#{item.number}</span>
                  <span className="min-w-0 flex-1 truncate">{item.title || `PR #${item.number}`}</span>
                </button>
                <button
                  type="button"
                  data-testid={`attached-pr-set-primary-${item.number}`}
                  className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-caption-2-medium text-text-tertiary hover:bg-background-secondary-hover hover:text-accent-500"
                  onClick={() => {
                    void setPrimary(item.number)
                    setExtrasOpen(false)
                  }}
                >
                  {t("chat.prSetPrimary")}
                </button>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}

      <BabysitStartConfirmDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        busy={busy}
        error={startError}
        onConfirm={onConfirmStart}
      />
      <BabysitStopConfirmDialog
        open={stopOpen}
        onOpenChange={setStopOpen}
        busy={busy}
        onConfirm={onConfirmStop}
      />
      <ConnectGithubCard open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  )
}
