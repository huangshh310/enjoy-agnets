/**
 * 交接后旧气泡与新引擎轮次的分界。新引擎只收到摘要，不是续跑。
 */
import { useT } from "@renderer/i18n"
import { isLegacyHandoffTurn } from "./handoff-legacy"

export { isLegacyHandoffTurn }

export function HandoffLegacyDivider() {
  const t = useT()
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <div className="h-px min-w-0 flex-1 bg-separator-border/80" />
      <p className="shrink-0 text-caption-2-medium text-text-tertiary">{t("chat.handoff.legacyHint")}</p>
      <div className="h-px min-w-0 flex-1 bg-separator-border/80" />
    </div>
  )
}
