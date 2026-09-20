/**
 * Composer 底栏溢出：会话目标 / 阶段总结。禁止贴在探索|执行旁。
 */
import { RiMoreLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useT } from "@renderer/i18n"
import { SessionGoalChip } from "./session-goal-chip"

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
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-text-tertiary ring-1 ring-border-button-default outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <RiMoreLine className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-[220px] rounded-xl border border-border-button-default bg-background-primary-default p-2 shadow-card"
      >
        <p className="px-1 pb-1.5 text-caption-2-regular text-text-tertiary">{t("chat.composerOverflowHint")}</p>
        <SessionGoalChip layout="menu" />
      </PopoverContent>
    </Popover>
  )
}
