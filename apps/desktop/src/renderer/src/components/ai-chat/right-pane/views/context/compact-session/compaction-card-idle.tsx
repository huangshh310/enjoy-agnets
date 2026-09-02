/**
 * 未压缩态：说明 + 手动压缩。不编造预计节省。
 */
import { RiSparklingLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function UncompactedBody({
  messageCount,
  isCompacting,
  onCompact
}: {
  messageCount: number
  isCompacting: boolean
  onCompact: () => void
}) {
  const t = useT()
  const canCompact = messageCount > 2

  return (
    <div className="flex flex-col gap-2.5 text-caption-2-regular text-text-secondary">
      <p className="leading-relaxed text-text-tertiary">{t("chat.inspectorCompactionSuggest")}</p>
      <button
        type="button"
        disabled={!canCompact || isCompacting}
        onClick={onCompact}
        className={cx(
          "flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-caption-1-medium font-medium transition-all shadow-2xs",
          canCompact
            ? "bg-accent-500 text-text-white hover:bg-accent-600 active:scale-98 cursor-pointer"
            : "bg-background-secondary-default text-text-tertiary opacity-60 cursor-not-allowed"
        )}
      >
        <RiSparklingLine className={cx("size-3.5", isCompacting && "animate-spin")} />
        <span>
          {isCompacting ? t("chat.inspectorCompactionCompacting") : t("chat.inspectorCompactionCompactNow")}
        </span>
      </button>
    </div>
  )
}
