/**
 * 会话目标行：菜单里全宽编辑，不贴探索|执行旁。
 */
import type { KeyboardEvent } from "react"
import { RiCheckLine, RiCompass3Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function SessionGoalRow({
  layout,
  editing,
  draft,
  current,
  onDraft,
  onStart,
  onSave,
  onKeyDown
}: {
  layout: "bar" | "menu"
  editing: boolean
  draft: string
  current: string
  onDraft: (value: string) => void
  onStart: () => void
  onSave: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  const t = useT()
  if (editing) {
    return (
      <div
        className={cx(
          "flex items-center gap-1 border border-accent-500 bg-background-primary-default px-2 shadow-2xs",
          layout === "menu" ? "h-8 w-full rounded-lg" : "h-6 rounded-full"
        )}
      >
        <RiCompass3Line className="size-3 shrink-0 text-accent-500" />
        <input
          type="text"
          value={draft}
          autoFocus
          placeholder={t("chat.setGoalPlaceholder")}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onSave}
          className="min-w-0 flex-1 bg-transparent text-caption-2-medium text-text-primary focus:outline-hidden"
        />
        <button type="button" onClick={onSave} className="cursor-pointer text-accent-600 hover:text-accent-500">
          <RiCheckLine className="size-3" />
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onStart}
      title={current ? t("chat.editGoalTitle") : undefined}
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 transition-colors",
        layout === "menu"
          ? "h-8 w-full rounded-lg px-2 hover:bg-background-secondary-hover"
          : "h-6 max-w-[180px] rounded-full px-2 hover:bg-background-tertiary-default",
        current ? "text-text-secondary hover:text-text-primary" : "text-text-tertiary hover:text-text-secondary"
      )}
    >
      <RiCompass3Line className={cx("size-3 shrink-0", current && "text-accent-500")} />
      <span className="min-w-0 truncate">{current || t("chat.addGoal")}</span>
    </button>
  )
}
