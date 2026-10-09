/**
 * 空态示例任务：输入框下方的命令 pill，点击填入 Composer。
 * CU 就绪且名单有真实应用时才多一枚 @{应用}，绝不虚构。
 */
import { RiWindowLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { useDesktopMentionApps } from "../composer/mentions/desktop/use-desktop-mention-apps.ts"
import { desktopEmptyStateExample } from "./desktop-empty-example.ts"
import { getIntentCards } from "./empty-state-constants"
import type { EmptyStateIntentItem } from "./empty-state.types"

interface EmptyStatePillsProps {
  onSelectPrompt: (prompt: string) => void
  className?: string
}

export function EmptyStatePills({ onSelectPrompt, className }: EmptyStatePillsProps) {
  const t = useT()
  const intentCards = getIntentCards(t)
  const desktopExample = desktopEmptyStateExample(useDesktopMentionApps())

  return (
    <div className={cx("flex w-full flex-col items-center gap-2", className)}>
      <p className="sr-only">{t("chat.emptySamples")}</p>
      <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {intentCards.map((item: EmptyStateIntentItem) => (
          <SamplePill
            key={item.id}
            label={item.shortTitle || item.title}
            title={item.description}
            onSelect={() => onSelectPrompt(item.prompt)}
            icon={item.icon}
          />
        ))}
        {desktopExample ? (
          <SamplePill
            testId="empty-state-desktop-pill"
            label={t("chat.intentDesktopShort", { app: desktopExample.displayName })}
            title={t("chat.intentDesktopDesc")}
            onSelect={() => onSelectPrompt(t("chat.intentDesktopPrompt", { app: desktopExample.displayName }))}
            icon={RiWindowLine}
            accent
          />
        ) : null}
      </div>
    </div>
  )
}

function SamplePill({
  label,
  title,
  onSelect,
  icon: Icon,
  accent,
  testId
}: {
  label: string
  title: string
  onSelect: () => void
  icon: EmptyStateIntentItem["icon"]
  accent?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onSelect}
      title={title}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption-1-medium",
        "transition-colors duration-200 active:scale-[0.98]",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        accent
          ? "bg-accent-500/10 text-accent-500 ring-1 ring-accent-500/20"
          : "bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      <span className="inline-grid size-5 place-items-center rounded-full bg-background-primary-default">
        <Icon className="size-3 text-accent-500" aria-hidden />
      </span>
      <span>{label}</span>
    </button>
  )
}
