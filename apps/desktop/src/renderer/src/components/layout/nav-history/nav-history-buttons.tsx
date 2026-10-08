/**
 * 标题栏后退 / 前进。不可用时仍占位，40% 透明度，点击无效。
 * 长按 400ms 列出这一侧最近 10 页。
 */
import { useState } from "react"
import { RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { HISTORY_MENU_LIMIT } from "@renderer/hooks/nav-history/constants"
import { jumpHistoryTo, travelHistory } from "@renderer/hooks/nav-history/nav-history-controller"
import { recentHistory } from "@renderer/hooks/nav-history/nav-history"
import { useNavHistoryStore } from "@renderer/hooks/nav-history/nav-history-store"
import type { HistorySide } from "@renderer/hooks/nav-history/nav-history.types"
import { NavHistoryMenu } from "./nav-history-menu"
import { useHistoryPress } from "./use-history-press"

type HistoryButtonProps = {
  side: HistorySide
  label: string
  icon: typeof RiArrowLeftLine
}

export function NavHistoryButtons() {
  const t = useT()
  return (
    <div role="group" aria-label={t("studio.window.history")} className="flex items-center gap-1">
      <HistoryButton side="past" label={t("studio.window.back")} icon={RiArrowLeftLine} />
      <HistoryButton side="future" label={t("studio.window.forward")} icon={RiArrowRightLine} />
    </div>
  )
}

function HistoryButton({ side, label, icon: Icon }: HistoryButtonProps) {
  const entries = useNavHistoryStore((state) => (side === "past" ? state.past : state.future))
  const enabled = entries.length > 0
  const menu = recentHistory(entries, HISTORY_MENU_LIMIT)
  const [open, setOpen] = useState(false)
  const direction = side === "past" ? "back" : "forward"
  const press = useHistoryPress(enabled, () => setOpen(menu.length > 0), () => {
    void travelHistory(direction)
  })

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-disabled={!enabled}
        data-testid={side === "past" ? "nav-back" : "nav-forward"}
        onDoubleClick={(event) => event.stopPropagation()}
        className={cx(
          "flex size-6 items-center justify-center rounded-md text-foreground-icon-secondary outline-none",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          "[app-region:no-drag]",
          enabled ? "cursor-pointer hover:bg-background-secondary-hover hover:text-text-primary" : "opacity-40"
        )}
        {...press}
      >
        <Icon className="size-4" aria-hidden />
      </button>
      {open ? (
        <NavHistoryMenu
          entries={menu}
          label={label}
          onClose={() => setOpen(false)}
          onSelect={(index) => {
            setOpen(false)
            void jumpHistoryTo(side, index)
          }}
        />
      ) : null}
    </div>
  )
}
