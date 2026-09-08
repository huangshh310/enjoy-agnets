/**
 * 规范化后没有题目：整卷 Skip = deny，不走 allow。
 */
import { useT } from "@renderer/i18n"
import type { AskUserEmptyProps } from "./ask-user.types"

export function AskUserEmpty({ onSkipAll }: AskUserEmptyProps) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-separator-border/80 bg-background-primary-default p-3">
      <p className="text-caption-1-regular text-text-secondary">{t("chat.askUserEmpty")}</p>
      <button type="button" className="text-caption-1-medium text-accent-500" onClick={onSkipAll}>
        {t("chat.askUserSkip")}
      </button>
    </div>
  )
}
