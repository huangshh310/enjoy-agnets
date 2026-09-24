/**
 * Composer 底栏溢出：会话目标 / 阶段总结。禁止贴在探索|执行旁。
 */
import { RiCompass3Line } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useT } from "@renderer/i18n"
import { SessionGoalChip } from "./session-goal-chip"
import { SessionHeartbeatForm } from "./session-heartbeat-form"

export function ComposerOverflowMenu() {
  const t = useT()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="composer-overflow"
          aria-label={t("chat.composerOverflow")}
          title={t("chat.composerOverflow")}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiCompass3Line className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-[320px] rounded-xl border border-border-button-default bg-background-primary-default p-2.5 shadow-card"
      >
        <div className="border-b border-separator-border/60 px-1 pb-2 mb-1.5">
          <p className="text-caption-1-semibold text-text-primary">{t("chat.composerOverflow")}</p>
          <p className="mt-0.5 text-caption-2-regular leading-normal text-text-tertiary">{t("chat.composerOverflowHint")}</p>
        </div>
        <SessionGoalChip layout="menu" />
        <SessionHeartbeatForm />
      </PopoverContent>
    </Popover>
  )
}
