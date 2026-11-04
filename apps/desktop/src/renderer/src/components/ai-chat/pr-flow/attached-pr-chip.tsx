/**
 * 会话挂 PR 芯片：「已挂 PR #n」+ 旁注「+N」小面板（可切主挂）。
 * 点主芯片 → 打开 PR URL（requestOpenExternalQuiet）；不挡 Dock / 权限 / 发送。
 */
import { useState } from "react"
import { RiGitPullRequestLine } from "@remixicon/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { requestOpenExternalQuiet } from "@renderer/lib/open-safe-external"
import { useT } from "@renderer/i18n"
import { useAttachedPrs } from "./use-attached-prs"

export function AttachedPrChip(props: {
  sessionId: string | null
  className?: string
  compact?: boolean
}) {
  const t = useT()
  const { primaryItem, extras, setPrimary } = useAttachedPrs(props.sessionId)
  const [open, setOpen] = useState(false)

  if (!primaryItem) return null

  function openUrl(url: string) {
    requestOpenExternalQuiet(url)
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

  if (extras.length === 0) return chip

  return (
    <div className="inline-flex min-w-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {chip}
      <Popover open={open} onOpenChange={setOpen}>
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
            <span className="min-w-0 flex-1 truncate">{primaryItem.title || t("chat.prPrimaryBadge")}</span>
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
                  setOpen(false)
                }}
              >
                {t("chat.prSetPrimary")}
              </button>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
