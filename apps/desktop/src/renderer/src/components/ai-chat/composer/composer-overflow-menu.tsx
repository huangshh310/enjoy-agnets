/**
 * Composer 底栏溢出：会话目标 / 阶段总结。禁止贴在探索|执行旁。
 * 733 一行（L3b 起）：底栏放不下的三颗可选 chip / 计量 / 收藏 / 预览由 footer 交给这里顶部小节原样渲染；
 * 钮上 6px 状态点只占绝对定位（不占宽），旁边常驻 sr-only 文本（复用原文案）。
 */
import { useEffect, useId, useState, type ReactNode } from "react"
import { useRouterState } from "@tanstack/react-router"
import { RiCompass3Line } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { SessionGoalChip } from "./session-goal-chip"
import { SessionHeartbeatForm } from "./session-heartbeat-form"
import { AppsnapWindowPicker } from "./appsnap-window-picker"
import type { FooterDotTone } from "./use-footer-optional-chips"

export function ComposerOverflowMenu({
  overflowSection,
  dot = "none",
  status = ""
}: {
  /** L3b 起底栏交过来的项；空就不画小节。 */
  overflowSection?: ReactNode
  dot?: FooterDotTone
  /** 常驻 sr-only：菜单里当前有哪些项（+ HostInject 黄色说明）。 */
  status?: string
} = {}) {
  const t = useT()
  const statusId = useId()
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // 「管理扩展」关掉内层后会导航；Composer 在设置页后仍常驻，外层也要关，否则回来残留一层。
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="composer-overflow"
            data-overflow-dot={dot === "none" ? undefined : dot}
            aria-label={t("chat.composerOverflow")}
            aria-describedby={status ? statusId : undefined}
            title={t("chat.composerOverflow")}
            className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiCompass3Line className="size-4" aria-hidden />
            {dot === "none" ? null : (
              <span
                aria-hidden
                data-testid="composer-overflow-dot"
                data-tone={dot}
                className={cx(
                  "pointer-events-none absolute top-[3px] right-[3px] size-1.5 rounded-full ring-2 ring-background-secondary-default dark:ring-background-tertiary-default",
                  dot === "warn" ? "bg-status-yellow-text" : "bg-accent-500"
                )}
              />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={6}
          className={cx(
            "w-[360px] rounded-xl border border-border-button-default bg-background-primary-default p-2.5 shadow-card",
            // L3b 起菜单顶部多了小节：矮窗（733×480）下整张菜单会高过可用空间、顶部被裁，新小节首当其冲。
            // 只在有小节时限高并可滚，L0–L3a 菜单与现网一字不差。
            overflowSection ? "max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain" : undefined
          )}
        >
          {overflowSection ? (
            <div
              data-testid="composer-overflow-footer-items"
              className="mb-1.5 flex flex-col gap-1.5 border-b border-separator-border/60 px-1 pb-2"
            >
              {overflowSection}
            </div>
          ) : null}
          <div className="border-b border-separator-border/60 px-1 pb-2 mb-1.5">
            <p className="text-caption-1-semibold text-text-primary">{t("chat.composerOverflow")}</p>
            <p className="mt-0.5 text-caption-2-regular leading-normal text-text-secondary">{t("chat.composerOverflowHint")}</p>
          </div>
          <SessionGoalChip layout="menu" />
          <SessionHeartbeatForm />
          <AppsnapWindowPicker />
        </PopoverContent>
      </Popover>
      <span id={statusId} className="sr-only" data-testid="composer-overflow-status">
        {status}
      </span>
    </>
  )
}
