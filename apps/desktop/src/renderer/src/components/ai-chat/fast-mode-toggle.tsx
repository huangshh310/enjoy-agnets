/**
 * 聊天输入框极速模式开关。文案走 i18n，中文只写「快速」。
 */
import { RiFlashlightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function FastModeToggle() {
  const t = useT()
  const isFastMode = useChatStore((state) => state.isFastMode)
  const toggleFastMode = useChatStore((state) => state.toggleFastMode)

  return (
    <button
      type="button"
      onClick={toggleFastMode}
      aria-pressed={isFastMode}
      aria-label={t("chat.fastMode")}
      title={isFastMode ? t("chat.fastModeOnHint") : t("chat.fastModeHint")}
      className={cx(
        "group flex h-8 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-caption-1-medium shadow-2xs outline-none transition-all duration-150 select-none active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        isFastMode
          ? "border border-status-yellow-text/40 bg-status-yellow-background/15 font-semibold text-status-yellow-text ring-1 ring-status-yellow-text/25 dark:text-status-yellow-text"
          : "border border-border-button-default bg-background-primary-default text-text-secondary hover:border-border-button-hover hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      <RiFlashlightLine
        className={cx(
          "size-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
          isFastMode ? "text-status-yellow-text dark:text-status-yellow-text" : "text-text-tertiary"
        )}
      />
      <span className="whitespace-nowrap text-caption-1-medium font-medium">{t("chat.fastMode")}</span>
    </button>
  )
}
